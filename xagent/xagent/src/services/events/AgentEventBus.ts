/**
 * Agent Event Bus
 * Enables event-driven agent behavior
 * Agents can subscribe to events and react automatically
 */

import { BaseAgent } from '../agent/BaseAgent';
import { getSupabaseClient } from '../../config/supabase';

export interface SystemEvent {
  id: string;
  type: string;
  source: string;
  data: any;
  timestamp: Date;
  priority: 'low' | 'medium' | 'high' | 'critical';
  processed: boolean;
}

export type EventHandler = (event: SystemEvent) => Promise<void>;

export class AgentEventBus {
  private static instance: AgentEventBus;
  private subscribers: Map<string, Set<{ agent: BaseAgent; handler: EventHandler }>> = new Map();
  private eventQueue: SystemEvent[] = [];
  private processing: boolean = false;
  private supabase;

  private constructor() {
    this.supabase = getSupabaseClient();
    this.initializeEventBus();
  }

  public static getInstance(): AgentEventBus {
    if (!this.instance) {
      this.instance = new AgentEventBus();
    }
    return this.instance;
  }

  private async initializeEventBus(): Promise<void> {
    console.log('📡 Agent Event Bus initialized');
    
    // Start event processor
    this.startEventProcessor();
    
    // Listen to Supabase realtime for external events
    this.subscribeToRealtimeEvents();
  }

  /**
   * Agent subscribes to an event type
   */
  subscribe(
    eventType: string,
    agent: BaseAgent,
    handler: EventHandler
  ): void {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, new Set());
    }

    this.subscribers.get(eventType)!.add({ agent, handler });

    console.log(`📌 Agent "${agent.getName()}" subscribed to event: ${eventType}`);
  }

  /**
   * Agent unsubscribes from an event type
   */
  unsubscribe(eventType: string, agent: BaseAgent): void {
    const subs = this.subscribers.get(eventType);
    if (!subs) return;

    for (const sub of subs) {
      if (sub.agent.getId() === agent.getId()) {
        subs.delete(sub);
      }
    }

    console.log(`📍 Agent "${agent.getName()}" unsubscribed from event: ${eventType}`);
  }

  /**
   * Emit an event - notify all subscribed agents
   */
  async emit(event: Omit<SystemEvent, 'id' | 'timestamp' | 'processed'>): Promise<void> {
    const fullEvent: SystemEvent = {
      id: crypto.randomUUID(),
      type: event.type,
      source: event.source,
      data: event.data,
      priority: event.priority,
      timestamp: new Date(),
      processed: false
    };

    // Add to queue
    this.eventQueue.push(fullEvent);

    // Store in database for audit
    await this.storeEvent(fullEvent);

    console.log(`📢 Event emitted: ${event.type} from ${event.source}`);

    // Process immediately if not already processing
    if (!this.processing) {
      this.processNextEvent();
    }
  }

  /**
   * Process events from queue
   */
  private async processNextEvent(): Promise<void> {
    if (this.processing || this.eventQueue.length === 0) {
      return;
    }

    this.processing = true;

    try {
      // Sort by priority
      this.eventQueue.sort((a, b) => {
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });

      const event = this.eventQueue.shift();
      if (!event) {
        this.processing = false;
        return;
      }

      await this.notifySubscribers(event);

      // Mark as processed
      event.processed = true;
      await this.markEventProcessed(event.id);

    } catch (error) {
      console.error('Error processing event:', error);
      
    } finally {
      this.processing = false;

      // Process next event if queue not empty
      if (this.eventQueue.length > 0) {
        setTimeout(() => this.processNextEvent(), 100);
      }
    }
  }

  /**
   * Notify all subscribers of an event
   */
  private async notifySubscribers(event: SystemEvent): Promise<void> {
    const subscribers = this.subscribers.get(event.type);
    
    if (!subscribers || subscribers.size === 0) {
      console.log(`📭 No subscribers for event: ${event.type}`);
      return;
    }

    console.log(`📬 Notifying ${subscribers.size} subscriber(s) for event: ${event.type}`);

    // Notify all subscribers in parallel
    const notifications = Array.from(subscribers).map(async ({ agent, handler }) => {
      try {
        console.log(`   → Notifying agent: ${agent.getName()}`);
        await handler(event);
        console.log(`   ✅ Agent ${agent.getName()} handled event`);
        
      } catch (error) {
        console.error(`   ❌ Agent ${agent.getName()} failed to handle event:`, error);
      }
    });

    await Promise.all(notifications);
  }

  /**
   * Start continuous event processor
   */
  private startEventProcessor(): void {
    setInterval(() => {
      if (!this.processing && this.eventQueue.length > 0) {
        this.processNextEvent();
      }
    }, 1000);
  }

  /**
   * Subscribe to Supabase realtime for external events
   */
  private subscribeToRealtimeEvents(): void {
    try {
      this.supabase
        .channel('agent_events')
        .on('postgres_changes', 
          { event: 'INSERT', schema: 'public', table: 'system_events' },
          (payload) => {
            // External event received via database
            const event = payload.new as any;
            
            if (!event.processed) {
              this.eventQueue.push({
                id: event.id,
                type: event.event_type,
                source: event.source,
                data: event.data,
                timestamp: new Date(event.timestamp),
                priority: event.priority || 'medium',
                processed: false
              });

              if (!this.processing) {
                this.processNextEvent();
              }
            }
          }
        )
        .subscribe();

      console.log('📡 Subscribed to realtime events');
      
    } catch (error) {
      console.warn('Could not subscribe to realtime events:', error);
    }
  }

  /**
   * Store event in database
   */
  private async storeEvent(event: SystemEvent): Promise<void> {
    try {
      await this.supabase
        .from('system_events')
        .insert({
          id: event.id,
          event_type: event.type,
          source: event.source,
          data: event.data,
          priority: event.priority,
          timestamp: event.timestamp,
          processed: event.processed
        });

    } catch (error) {
      // Silent fail - event bus continues to work in-memory
      console.warn('Could not store event in database:', error);
    }
  }

  /**
   * Mark event as processed
   */
  private async markEventProcessed(eventId: string): Promise<void> {
    try {
      await this.supabase
        .from('system_events')
        .update({ processed: true, processed_at: new Date() })
        .eq('id', eventId);

    } catch (error) {
      // Silent fail
    }
  }

  /**
   * Get pending events
   */
  async getPendingEvents(): Promise<SystemEvent[]> {
    const { data, error } = await this.supabase
      .from('system_events')
      .select('*')
      .eq('processed', false)
      .order('timestamp', { ascending: false })
      .limit(100);

    if (error || !data) {
      return [];
    }

    return data.map(e => ({
      id: e.id,
      type: e.event_type,
      source: e.source,
      data: e.data,
      timestamp: new Date(e.timestamp),
      priority: e.priority,
      processed: e.processed
    }));
  }

  /**
   * Get event history
   */
  async getEventHistory(limit: number = 50): Promise<SystemEvent[]> {
    const { data, error } = await this.supabase
      .from('system_events')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error || !data) {
      return [];
    }

    return data.map(e => ({
      id: e.id,
      type: e.event_type,
      source: e.source,
      data: e.data,
      timestamp: new Date(e.timestamp),
      priority: e.priority,
      processed: e.processed
    }));
  }

  /**
   * Get subscriber count for event type
   */
  getSubscriberCount(eventType: string): number {
    return this.subscribers.get(eventType)?.size || 0;
  }

  /**
   * Get all event types with subscribers
   */
  getEventTypes(): string[] {
    return Array.from(this.subscribers.keys());
  }

  /**
   * Cleanup
   */
  shutdown(): void {
    console.log('🛑 Shutting down Event Bus...');
    this.subscribers.clear();
    this.eventQueue = [];
    this.processing = false;
    console.log('✅ Event Bus shutdown complete');
  }
}


