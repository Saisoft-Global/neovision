import { createChatCompletion } from '../../openai/chat';
import type { Document } from '../../../types/document';

export class ResponseGenerator {
  async generateContextualResponse(
    query: string,
    documents: Document[]
  ): Promise<string> {
    const context = this.buildContext(documents);
    const response = await this.queryLLM(query, context);
    return this.extractResponse(response);
  }

  private buildContext(documents: Document[]): string {
    return documents
      .map(doc => doc.content)
      .join('\n\n');
  }

  private async queryLLM(query: string, context: string) {
    return createChatCompletion([
      {
        role: 'system',
        content: 'You are a helpful assistant. Use the provided context to answer questions accurately.',
      },
      {
        role: 'user',
        content: `Context:\n${context}\n\nQuestion: ${query}`,
      },
    ]);
  }

  private extractResponse(response: any): string {
    return response?.choices[0]?.message?.content || '';
  }
}