/**
 * Browser Visualization Service
 * Shows user what the browser automation is doing in real-time
 * Provides live updates, screenshots, and step-by-step narration
 */

import { Page } from 'playwright';
import { EventEmitter } from 'events';

export interface VisualizationEvent {
  type: 'step_start' | 'step_complete' | 'screenshot' | 'navigation' | 'user_action' | 'error' | 'complete';
  timestamp: string;
  message: string;
  data?: any;
  screenshot?: string;
}

export class BrowserVisualizationService extends EventEmitter {
  private static instance: BrowserVisualizationService;
  private isRecording: boolean = false;
  private events: VisualizationEvent[] = [];

  public static getInstance(): BrowserVisualizationService {
    if (!this.instance) {
      this.instance = new BrowserVisualizationService();
    }
    return this.instance;
  }

  /**
   * Start recording browser automation
   */
  startRecording(): void {
    this.isRecording = true;
    this.events = [];
    console.log('📹 Browser visualization recording started');
  }

  /**
   * Stop recording
   */
  stopRecording(): VisualizationEvent[] {
    this.isRecording = false;
    console.log(`📹 Recording stopped: ${this.events.length} events captured`);
    return [...this.events];
  }

  /**
   * Log a step being executed
   */
  logStep(step: string, description: string, data?: any): void {
    const event: VisualizationEvent = {
      type: 'step_start',
      timestamp: new Date().toISOString(),
      message: `${step}: ${description}`,
      data
    };

    this.events.push(event);
    this.emit('step', event);
    
    console.log(`  🔹 ${event.message}`);
  }

  /**
   * Log step completion
   */
  logStepComplete(step: string, success: boolean, details?: string): void {
    const event: VisualizationEvent = {
      type: 'step_complete',
      timestamp: new Date().toISOString(),
      message: success ? `✅ ${step} completed` : `❌ ${step} failed`,
      data: { success, details }
    };

    this.events.push(event);
    this.emit('step_complete', event);
    
    console.log(`  ${success ? '✅' : '❌'} ${step}${details ? `: ${details}` : ''}`);
  }

  /**
   * Log navigation event
   */
  logNavigation(url: string, purpose: string): void {
    const event: VisualizationEvent = {
      type: 'navigation',
      timestamp: new Date().toISOString(),
      message: `Navigating to ${new URL(url).hostname}`,
      data: { url, purpose }
    };

    this.events.push(event);
    this.emit('navigation', event);
    
    console.log(`  🌐 Navigating to: ${url}`);
    console.log(`     Purpose: ${purpose}`);
  }

  /**
   * Capture and log screenshot
   */
  async captureScreenshot(page: Page, description: string): Promise<void> {
    if (!this.isRecording) return;

    try {
      const screenshot = await page.screenshot({ fullPage: false });
      const screenshotBase64 = screenshot.toString('base64');

      const event: VisualizationEvent = {
        type: 'screenshot',
        timestamp: new Date().toISOString(),
        message: description,
        screenshot: screenshotBase64
      };

      this.events.push(event);
      this.emit('screenshot', event);
      
      console.log(`  📸 Screenshot captured: ${description}`);

    } catch (error) {
      console.warn(`⚠️ Screenshot failed: ${error}`);
    }
  }

  /**
   * Log user action (typing, clicking, etc.)
   */
  logUserAction(action: string, target: string, value?: any): void {
    const event: VisualizationEvent = {
      type: 'user_action',
      timestamp: new Date().toISOString(),
      message: `${action} ${target}${value ? ` with "${value}"` : ''}`,
      data: { action, target, value }
    };

    this.events.push(event);
    this.emit('user_action', event);
    
    console.log(`  ⌨️  ${event.message}`);
  }

  /**
   * Log error
   */
  logError(step: string, error: string): void {
    const event: VisualizationEvent = {
      type: 'error',
      timestamp: new Date().toISOString(),
      message: `Error in ${step}: ${error}`,
      data: { step, error }
    };

    this.events.push(event);
    this.emit('error', event);
    
    console.error(`  ❌ Error: ${error}`);
  }

  /**
   * Log completion
   */
  logComplete(success: boolean, summary: string): void {
    const event: VisualizationEvent = {
      type: 'complete',
      timestamp: new Date().toISOString(),
      message: summary,
      data: { success }
    };

    this.events.push(event);
    this.emit('complete', event);
    
    console.log(`  ${success ? '✅' : '❌'} ${summary}`);
  }

  /**
   * Get all recorded events
   */
  getEvents(): VisualizationEvent[] {
    return [...this.events];
  }

  /**
   * Get execution summary
   */
  getSummary(): {
    totalSteps: number;
    successfulSteps: number;
    failedSteps: number;
    screenshots: number;
    duration: number;
  } {
    const startTime = this.events[0]?.timestamp;
    const endTime = this.events[this.events.length - 1]?.timestamp;
    const duration = startTime && endTime 
      ? new Date(endTime).getTime() - new Date(startTime).getTime()
      : 0;

    return {
      totalSteps: this.events.filter(e => e.type === 'step_start').length,
      successfulSteps: this.events.filter(e => 
        e.type === 'step_complete' && e.data?.success
      ).length,
      failedSteps: this.events.filter(e => 
        e.type === 'step_complete' && !e.data?.success
      ).length,
      screenshots: this.events.filter(e => e.type === 'screenshot').length,
      duration
    };
  }

  /**
   * Clear all events
   */
  clear(): void {
    this.events = [];
    this.removeAllListeners();
  }
}

export const browserVisualization = BrowserVisualizationService.getInstance();



