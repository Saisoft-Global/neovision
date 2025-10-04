import { generateEmbeddings } from '../openai/embeddings';
import { getVectorIndex } from '../pinecone/client';
import { LLMOrchestrator } from '../llm/LLMOrchestrator';
import type { ChatMessage } from '../llm/types';

export class DocumentAwareChat {
  private static instance: DocumentAwareChat;
  private llmOrchestrator: LLMOrchestrator;

  private constructor() {
    this.llmOrchestrator = LLMOrchestrator.getInstance();
  }

  public static getInstance(): DocumentAwareChat {
    if (!this.instance) {
      this.instance = new DocumentAwareChat();
    }
    return this.instance;
  }

  async processQuestion(question: string): Promise<string> {
    try {
      // Generate embeddings for the question
      const questionEmbeddings = await generateEmbeddings(question);

      // Search for relevant documents
      const vectorIndex = await getVectorIndex();
      if (!vectorIndex) {
        return this.generateResponseWithoutContext(question);
      }

      const results = await vectorIndex.query({
        vector: questionEmbeddings,
        topK: 3,
        includeMetadata: true,
      });

      // Build context from relevant documents
      const context = results.matches
        .map(match => match.metadata.content)
        .join('\n\n');

      // Generate response using context
      const messages: ChatMessage[] = [
        {
          role: 'system',
          content: `You are a helpful assistant. Use the following context to answer questions accurately:\n\n${context}`,
        },
        { role: 'user', content: question },
      ];

      const response = await this.llmOrchestrator.getResponse(messages);
      return response.content;

    } catch (error) {
      console.error('Error processing question:', error);
      return 'I apologize, but I encountered an error while processing your question. Please try again.';
    }
  }

  private async generateResponseWithoutContext(question: string): Promise<string> {
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: 'You are a helpful assistant. Answer questions to the best of your ability.',
      },
      { role: 'user', content: question },
    ];

    const response = await this.llmOrchestrator.getResponse(messages);
    return response.content;
  }
}