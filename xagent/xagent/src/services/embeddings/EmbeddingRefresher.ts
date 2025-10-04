import { DocumentProcessor } from '../knowledge/document/DocumentProcessor';
import { vectorStore } from '../pinecone/client';
import { createClient } from '@supabase/supabase-js';

export class EmbeddingRefresher {
  private supabase;
  private processor: DocumentProcessor;
  private refreshInterval: number = 24 * 60 * 60 * 1000; // 24 hours

  constructor() {
    this.supabase = createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_ANON_KEY
    );
    this.processor = new DocumentProcessor();
    this.startRefreshCycle();
  }

  private async startRefreshCycle() {
    setInterval(async () => {
      await this.refreshEmbeddings();
    }, this.refreshInterval);
  }

  private async refreshEmbeddings() {
    const documents = await this.getDocumentsForRefresh();
    
    for (const doc of documents) {
      const refreshedDoc = await this.processor.processDocument(doc);
      await this.updateEmbeddings(refreshedDoc);
    }
  }

  private async getDocumentsForRefresh() {
    const { data, error } = await this.supabase
      .from('documents')
      .select('*')
      .lt('last_refreshed', new Date(Date.now() - this.refreshInterval));

    if (error) throw error;
    return data;
  }

  private async updateEmbeddings(document: any) {
    await vectorStore.update([{
      id: document.id,
      values: document.embeddings,
      metadata: {
        last_refreshed: new Date(),
      },
    }]);
  }
}