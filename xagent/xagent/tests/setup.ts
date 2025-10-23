/**
 * Global Test Setup
 * Runs before all tests
 */

import { config } from 'dotenv';
import path from 'path';

// Load test environment variables
config({ path: path.resolve(__dirname, '../.env.test') });

// Mock external services in test environment
if (process.env.NODE_ENV === 'test') {
  console.log('🧪 Test environment initialized');
  console.log('📦 Mocking external services...');
  
  // Mock OpenAI API
  process.env.VITE_OPENAI_API_KEY = process.env.VITE_OPENAI_API_KEY || 'test-key';
  
  // Mock Supabase
  process.env.VITE_SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'http://localhost:54321';
  process.env.VITE_SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'test-anon-key';
  
  // Disable actual browser automation in tests
  process.env.DISABLE_BROWSER_AUTOMATION = 'true';
}

// Global test utilities
global.testHelpers = {
  createMockAgent: (type: string) => ({
    id: `test-agent-${type}`,
    type,
    name: `Test ${type} Agent`,
    organizationId: 'test-org-id',
  }),
  
  createMockMessage: (content: string, userId = 'test-user') => ({
    content,
    userId,
    timestamp: new Date().toISOString(),
  }),
  
  waitFor: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
};

console.log('✅ Test setup complete');


