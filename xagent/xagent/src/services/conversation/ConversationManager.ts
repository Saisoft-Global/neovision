import { ConversationArchiver } from './ConversationArchiver';
import { ConversationContextManager } from './ConversationContextManager';
import { TokenManager } from './TokenManager';

/**
 * Central manager for all conversation-related functionality
 */
export class ConversationManager {
  private static instance: ConversationManager;
  private archiver: ConversationArchiver;
  private contextManager: ConversationContextManager;
  private tokenManager: TokenManager;
  private isInitialized: boolean = false;

  private constructor() {
    this.archiver = ConversationArchiver.getInstance();
    this.contextManager = ConversationContextManager.getInstance();
    this.tokenManager = TokenManager.getInstance();
  }

  static getInstance(): ConversationManager {
    if (!this.instance) {
      this.instance = new ConversationManager();
    }
    return this.instance;
  }

  /**
   * Initialize conversation management system
   */
  initialize(): void {
    if (this.isInitialized) {
      console.log('✅ ConversationManager already initialized');
      return;
    }

    console.log('🚀 Initializing ConversationManager...');

    // Start scheduled archiving
    this.archiver.startScheduledArchiving();

    this.isInitialized = true;
    console.log('✅ ConversationManager initialized successfully');
  }

  /**
   * Shutdown conversation management system
   */
  shutdown(): void {
    if (!this.isInitialized) {
      return;
    }

    console.log('⏹️ Shutting down ConversationManager...');
    this.archiver.stopScheduledArchiving();
    this.isInitialized = false;
    console.log('✅ ConversationManager shutdown complete');
  }

  /**
   * Get archiver instance
   */
  getArchiver(): ConversationArchiver {
    return this.archiver;
  }

  /**
   * Get context manager instance
   */
  getContextManager(): ConversationContextManager {
    return this.contextManager;
  }

  /**
   * Get token manager instance
   */
  getTokenManager(): TokenManager {
    return this.tokenManager;
  }

  /**
   * Get conversation health status
   */
  getHealthStatus(): {
    initialized: boolean;
    archiverRunning: boolean;
    activeConversations: number;
    archivedConversations: number;
  } {
    let activeConversations = 0;
    let archivedConversations = 0;

    try {
      // Count active conversations in sessionStorage
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && key.startsWith('chat_turns_')) {
          activeConversations++;
        }
      }

      // Count archived conversations in localStorage
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('archives_')) {
          const stored = localStorage.getItem(key);
          if (stored) {
            const archives = JSON.parse(stored);
            archivedConversations += archives.length;
          }
        }
      }
    } catch (error) {
      console.error('Failed to get health status:', error);
    }

    return {
      initialized: this.isInitialized,
      archiverRunning: this.archiver['isScheduled'],
      activeConversations,
      archivedConversations
    };
  }
}
