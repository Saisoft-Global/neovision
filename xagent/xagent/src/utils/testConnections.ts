import { neo4jClient } from '../services/neo4j/client';
import { getVectorStore } from '../services/pinecone/client';
import { checkSupabaseConnection } from '../config/supabase';

export async function testDatabaseConnections() {
  const results = {
    neo4j: false,
    pinecone: false,
    supabase: false
  };

  try {
    // Test Neo4j
    if (neo4jClient) {
      await neo4jClient.connect();
      results.neo4j = neo4jClient.isConnected();
    }

    // Test Pinecone
    const vectorStore = await getVectorStore();
    if (vectorStore) {
      await vectorStore.describeIndexStats();
      results.pinecone = true;
    }

    // Test Supabase
    results.supabase = await checkSupabaseConnection();

    return results;
  } catch (error) {
    console.error('Database connection test failed:', error);
    return results;
  }
}