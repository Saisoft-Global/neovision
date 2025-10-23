import { createChatCompletion } from '../openai/chat';
import { KnowledgeService } from '../knowledge/KnowledgeService';
import { MemoryService } from '../memory/MemoryService';
import { ConversationContextManager } from './ConversationContextManager';
import { isServiceConfigured } from '../../config/environment';
import type { ChatMessage } from '../llm/types';

interface ArchivedConversation {
  id: string;
  threadId: string;
  userId: string;
  summary: string;
  insights: string[];
  actionItems: string[];
  keyDecisions: string[];
  messageCount: number;
  startDate: string;
  endDate: string;
  archivedAt: string;
}

export class ConversationArchiver {
  private static instance: ConversationArchiver;
  private knowledgeService: KnowledgeService;
  private memoryService: MemoryService;
  private contextManager: ConversationContextManager;
  private isScheduled: boolean = false;

  private readonly ARCHIVE_AFTER_DAYS = 7;
  private readonly INACTIVE_AFTER_HOURS = 24;
  private readonly CHECK_INTERVAL_HOURS = 6;

  private constructor() {
    this.knowledgeService = KnowledgeService.getInstance();
    this.memoryService = MemoryService.getInstance();
    this.contextManager = ConversationContextManager.getInstance();
  }

  static getInstance(): ConversationArchiver {
    if (!this.instance) {
      this.instance = new ConversationArchiver();
    }
    return this.instance;
  }

  /**
   * Start scheduled archiving
   */
  startScheduledArchiving(): void {
    if (this.isScheduled) {
      console.log('📅 Conversation archiving already scheduled');
      return;
    }

    console.log('📅 Starting scheduled conversation archiving...');
    this.isScheduled = true;

    // Run immediately
    this.archiveInactiveConversations();

    // Schedule periodic runs
    setInterval(() => {
      this.archiveInactiveConversations();
    }, this.CHECK_INTERVAL_HOURS * 60 * 60 * 1000);
  }

  /**
   * Stop scheduled archiving
   */
  stopScheduledArchiving(): void {
    this.isScheduled = false;
    console.log('⏹️ Stopped scheduled conversation archiving');
  }

  /**
   * Archive inactive conversations
   */
  async archiveInactiveConversations(): Promise<void> {
    if (!isServiceConfigured('openai')) {
      console.log('⚠️ OpenAI not configured, skipping archiving');
      return;
    }

    console.log('🔍 Checking for inactive conversations to archive...');

    try {
      const inactiveThreads = this.getInactiveThreads();
      console.log(`📦 Found ${inactiveThreads.length} inactive conversations to archive`);

      for (const threadId of inactiveThreads) {
        await this.archiveThread(threadId);
      }

      console.log('✅ Conversation archiving complete');
    } catch (error) {
      console.error('Failed to archive conversations:', error);
    }
  }

  /**
   * Get list of inactive thread IDs
   */
  private getInactiveThreads(): string[] {
    const inactiveThreads: string[] = [];

    try {
      // Scan sessionStorage for chat_turns_* keys
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        
        if (key && key.startsWith('chat_turns_')) {
          const threadId = key.replace('chat_turns_', '');
          
          // Check if should archive
          if (this.contextManager.shouldArchiveConversation(threadId, this.INACTIVE_AFTER_HOURS)) {
            inactiveThreads.push(threadId);
          }
        }
      }
    } catch (error) {
      console.error('Failed to get inactive threads:', error);
    }

    return inactiveThreads;
  }

  /**
   * Archive a single thread
   */
  async archiveThread(threadId: string, userId?: string): Promise<ArchivedConversation | null> {
    try {
      console.log(`📦 Archiving conversation: ${threadId}`);

      // 1. Get conversation history
      const history = this.contextManager.getConversationHistory(threadId);
      
      if (history.length === 0) {
        console.log(`⚠️ No history found for thread: ${threadId}`);
        return null;
      }

      // 2. Generate comprehensive summary
      const summary = await this.generateComprehensiveSummary(history);

      // 3. Extract insights and action items
      const analysis = await this.analyzeConversation(history);

      // 4. Create archived conversation record
      const archived: ArchivedConversation = {
        id: crypto.randomUUID(),
        threadId,
        userId: userId || 'unknown',
        summary: summary,
        insights: analysis.insights,
        actionItems: analysis.actionItems,
        keyDecisions: analysis.keyDecisions,
        messageCount: history.length,
        startDate: history[0]?.content ? new Date().toISOString() : new Date().toISOString(),
        endDate: new Date().toISOString(),
        archivedAt: new Date().toISOString()
      };

      // 5. Store as knowledge document
      await this.storeAsKnowledge(archived);

      // 6. Store in vector DB for semantic search
      await this.storeInVectorDB(archived);

      // 7. Clear original conversation
      this.contextManager.clearConversationHistory(threadId);

      // 8. Store archive reference in localStorage
      this.storeArchiveReference(archived);

      console.log(`✅ Archived conversation: ${threadId} (${history.length} messages)`);
      return archived;

    } catch (error) {
      console.error(`Failed to archive thread ${threadId}:`, error);
      return null;
    }
  }

  /**
   * Generate comprehensive summary of conversation
   */
  private async generateComprehensiveSummary(messages: ChatMessage[]): Promise<string> {
    const conversationText = messages
      .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n\n');

    const response = await createChatCompletion([
      {
        role: 'system',
        content: `Generate a comprehensive summary of this conversation. Include:
1. Main topics discussed
2. Key information shared
3. Questions asked and answered
4. Important context
5. Overall conversation flow

Keep the summary detailed but concise (300-500 words).`
      },
      {
        role: 'user',
        content: conversationText
      }
    ], 'gpt-3.5-turbo', 0.3);

    return response?.choices[0]?.message?.content || 'Conversation summary unavailable.';
  }

  /**
   * Analyze conversation for insights, action items, and decisions
   */
  private async analyzeConversation(messages: ChatMessage[]): Promise<{
    insights: string[];
    actionItems: string[];
    keyDecisions: string[];
  }> {
    const conversationText = messages
      .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n\n');

    try {
      const response = await createChatCompletion([
        {
          role: 'system',
          content: `Analyze this conversation and extract:
1. Key insights or learnings
2. Action items or tasks mentioned
3. Important decisions made

Return as JSON:
{
  "insights": ["insight1", "insight2"],
  "actionItems": ["action1", "action2"],
  "keyDecisions": ["decision1", "decision2"]
}`
        },
        {
          role: 'user',
          content: conversationText
        }
      ], 'gpt-3.5-turbo', 0.3);

      const analysisText = response?.choices[0]?.message?.content || '{}';
      
      // Extract JSON from response (handle markdown formatting)
      let jsonText = analysisText.trim();
      if (jsonText.startsWith('```json')) {
        jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      } else if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/```\n?/g, '').trim();
      }

      const analysis = JSON.parse(jsonText);

      return {
        insights: analysis.insights || [],
        actionItems: analysis.actionItems || [],
        keyDecisions: analysis.keyDecisions || []
      };
    } catch (error) {
      console.error('Failed to analyze conversation:', error);
      return {
        insights: [],
        actionItems: [],
        keyDecisions: []
      };
    }
  }

  /**
   * Store archived conversation as knowledge document
   */
  private async storeAsKnowledge(archived: ArchivedConversation): Promise<void> {
    try {
      const content = `
# Conversation Archive

**Thread ID:** ${archived.threadId}
**Date Range:** ${archived.startDate} to ${archived.endDate}
**Messages:** ${archived.messageCount}

## Summary
${archived.summary}

## Key Insights
${archived.insights.map(i => `- ${i}`).join('\n')}

## Action Items
${archived.actionItems.map(a => `- ${a}`).join('\n')}

## Key Decisions
${archived.keyDecisions.map(d => `- ${d}`).join('\n')}
`;

      await this.knowledgeService.addDocument({
        id: archived.id,
        title: `Conversation: ${archived.threadId.slice(0, 8)}`,
        content: content,
        doc_type: 'conversation_archive',
        metadata: {
          threadId: archived.threadId,
          userId: archived.userId,
          messageCount: archived.messageCount,
          startDate: archived.startDate,
          endDate: archived.endDate,
          archivedAt: archived.archivedAt,
          insights: archived.insights,
          actionItems: archived.actionItems,
          keyDecisions: archived.keyDecisions
        },
        status: 'completed'
      });

      console.log(`📚 Stored conversation as knowledge document: ${archived.id}`);
    } catch (error) {
      console.error('Failed to store as knowledge:', error);
    }
  }

  /**
   * Store in vector DB for semantic search
   */
  private async storeInVectorDB(archived: ArchivedConversation): Promise<void> {
    if (!isServiceConfigured('openai')) {
      return;
    }

    try {
      const vectorStore = await getVectorStore();
      if (!vectorStore) {
        return;
      }

      // Generate embeddings for the summary
      const { generateEmbeddings } = await import('../openai/embeddings');
      const embeddings = await generateEmbeddings(archived.summary);

      await vectorStore.upsert([{
        id: archived.id,
        values: embeddings,
        metadata: {
          type: 'conversation_archive',
          threadId: archived.threadId,
          userId: archived.userId,
          summary: archived.summary,
          insights: archived.insights,
          actionItems: archived.actionItems,
          keyDecisions: archived.keyDecisions,
          messageCount: archived.messageCount,
          archivedAt: archived.archivedAt
        }
      }]);

      console.log(`🔮 Stored conversation in vector DB: ${archived.id}`);
    } catch (error) {
      console.error('Failed to store in vector DB:', error);
    }
  }

  /**
   * Store archive reference in localStorage
   */
  private storeArchiveReference(archived: ArchivedConversation): void {
    try {
      const key = `archives_${archived.userId}`;
      const existing = localStorage.getItem(key);
      const archives: ArchivedConversation[] = existing ? JSON.parse(existing) : [];
      
      archives.push(archived);
      
      // Keep last 100 archives
      const trimmed = archives.slice(-100);
      localStorage.setItem(key, JSON.stringify(trimmed));

      console.log(`💾 Stored archive reference: ${archived.id}`);
    } catch (error) {
      console.error('Failed to store archive reference:', error);
    }
  }

  /**
   * Get archived conversations for a user
   */
  getArchivedConversations(userId: string): ArchivedConversation[] {
    try {
      const key = `archives_${userId}`;
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to get archived conversations:', error);
      return [];
    }
  }

  /**
   * Search archived conversations
   */
  async searchArchivedConversations(
    query: string,
    userId: string,
    limit: number = 10
  ): Promise<ArchivedConversation[]> {
    if (!isServiceConfigured('openai')) {
      return [];
    }

    try {
      const { generateEmbeddings } = await import('../openai/embeddings');
      const queryEmbedding = await generateEmbeddings(query);
      
      const vectorStore = await getVectorStore();
      if (!vectorStore) {
        return [];
      }

      const results = await vectorStore.query({
        vector: queryEmbedding,
        topK: limit,
        filter: {
          type: 'conversation_archive',
          userId
        },
        includeMetadata: true
      });

      return results.matches.map(match => ({
        id: match.id,
        threadId: match.metadata.threadId,
        userId: match.metadata.userId,
        summary: match.metadata.summary,
        insights: match.metadata.insights || [],
        actionItems: match.metadata.actionItems || [],
        keyDecisions: match.metadata.keyDecisions || [],
        messageCount: match.metadata.messageCount || 0,
        startDate: match.metadata.startDate || '',
        endDate: match.metadata.endDate || '',
        archivedAt: match.metadata.archivedAt || ''
      }));
    } catch (error) {
      console.error('Failed to search archived conversations:', error);
      return [];
    }
  }

  /**
   * Manually archive a specific thread
   */
  async manualArchive(threadId: string, userId: string): Promise<ArchivedConversation | null> {
    console.log(`📦 Manually archiving thread: ${threadId}`);
    return await this.archiveThread(threadId, userId);
  }

  /**
   * Export conversation as markdown
   */
  async exportConversationAsMarkdown(threadId: string): Promise<string> {
    const history = this.contextManager.getConversationHistory(threadId);
    
    if (history.length === 0) {
      return '# No conversation history found';
    }

    const markdown = `# Conversation Export

**Thread ID:** ${threadId}
**Exported:** ${new Date().toISOString()}
**Messages:** ${history.length}

---

${history.map((msg, index) => `
## Message ${index + 1} - ${msg.role === 'user' ? '👤 User' : '🤖 Assistant'}

${msg.content}

---
`).join('\n')}
`;

    return markdown;
  }

  /**
   * Get conversation statistics
   */
  getConversationStats(threadId: string): {
    messageCount: number;
    userMessages: number;
    assistantMessages: number;
    totalCharacters: number;
    estimatedTokens: number;
    lastActivity: string | null;
  } {
    const history = this.contextManager.getConversationHistory(threadId);
    
    const userMessages = history.filter(m => m.role === 'user').length;
    const assistantMessages = history.filter(m => m.role === 'assistant').length;
    const totalCharacters = history.reduce((sum, m) => sum + m.content.length, 0);
    
    const tokenManager = TokenManager.getInstance();
    const estimatedTokens = tokenManager.countMessagesTokens(history);

    // Get last activity from sessionStorage
    let lastActivity: string | null = null;
    try {
      const key = `chat_turns_${threadId}`;
      const stored = sessionStorage.getItem(key);
      if (stored) {
        const turns = JSON.parse(stored);
        if (turns.length > 0) {
          lastActivity = turns[turns.length - 1].timestamp;
        }
      }
    } catch (error) {
      console.error('Failed to get last activity:', error);
    }

    return {
      messageCount: history.length,
      userMessages,
      assistantMessages,
      totalCharacters,
      estimatedTokens,
      lastActivity
    };
  }
}
