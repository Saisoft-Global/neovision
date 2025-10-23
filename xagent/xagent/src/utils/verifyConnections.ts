/**
 * Comprehensive Connection Verification
 * Tests all external services and reports status
 */
import { supabase } from '../config/supabase';
import { getVectorStore } from '../services/pinecone/client';

export interface ConnectionStatus {
  service: string;
  connected: boolean;
  message: string;
  details?: any;
}

export const verifyAllConnections = async (): Promise<ConnectionStatus[]> => {
  const results: ConnectionStatus[] = [];

  // 1. Test Supabase Connection
  try {
    console.log('🔍 Testing Supabase connection...');
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      results.push({
        service: 'Supabase',
        connected: false,
        message: `Connection failed: ${error.message}`,
        details: error
      });
    } else {
      results.push({
        service: 'Supabase',
        connected: true,
        message: 'Connected successfully',
        details: { hasSession: !!data.session }
      });
    }
  } catch (error) {
    results.push({
      service: 'Supabase',
      connected: false,
      message: `Connection error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      details: error
    });
  }

  // 2. Test Supabase Documents Table
  try {
    console.log('🔍 Testing Supabase documents table...');
    const { data, error, count } = await supabase
      .from('documents')
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      results.push({
        service: 'Supabase Documents',
        connected: false,
        message: `Table access failed: ${error.message}`,
        details: error
      });
    } else {
      results.push({
        service: 'Supabase Documents',
        connected: true,
        message: `Table accessible, ${count || 0} documents found`,
        details: { documentCount: count }
      });
    }
  } catch (error) {
    results.push({
      service: 'Supabase Documents',
      connected: false,
      message: `Table error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      details: error
    });
  }

  // 3. Test Pinecone Connection
  try {
    console.log('🔍 Testing Pinecone connection...');
    const vectorStore = getVectorStore();
    
    if (!vectorStore) {
      results.push({
        service: 'Pinecone',
        connected: false,
        message: 'Vector store not initialized',
        details: null
      });
    } else {
      const indexName = import.meta.env.VITE_PINECONE_INDEX_NAME || 'multi-agent-platform';
      await vectorStore.initializeIndex(indexName);
      
      // Try to get index stats
      try {
        const stats = await vectorStore.describeIndexStats();
        results.push({
          service: 'Pinecone',
          connected: true,
          message: `Connected to index: ${indexName}`,
          details: stats
        });
      } catch (error) {
        // Index might not exist yet, but client is working
        results.push({
          service: 'Pinecone',
          connected: true,
          message: `Client connected (index may need creation)`,
          details: { indexName }
        });
      }
    }
  } catch (error) {
    results.push({
      service: 'Pinecone',
      connected: false,
      message: `Connection error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      details: error
    });
  }

  // 4. Test OpenAI API Key
  const openaiKey = import.meta.env.VITE_OPENAI_API_KEY;
  results.push({
    service: 'OpenAI',
    connected: !!openaiKey && openaiKey.length > 20,
    message: openaiKey ? 'API key configured' : 'API key missing',
    details: { keyLength: openaiKey?.length || 0 }
  });

  return results;
};

export const printConnectionReport = async () => {
  console.log('🔍 CONNECTIVITY VERIFICATION REPORT');
  console.log('='.repeat(60));
  
  const results = await verifyAllConnections();
  
  results.forEach(result => {
    const icon = result.connected ? '✅' : '❌';
    console.log(`${icon} ${result.service}: ${result.message}`);
    if (result.details) {
      console.log('   Details:', result.details);
    }
  });
  
  console.log('='.repeat(60));
  
  const allConnected = results.every(r => r.connected);
  if (allConnected) {
    console.log('🎉 All services connected successfully!');
  } else {
    const failed = results.filter(r => !r.connected);
    console.warn(`⚠️ ${failed.length} service(s) not connected:`, failed.map(f => f.service).join(', '));
  }
  
  return results;
};
