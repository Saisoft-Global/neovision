/**
 * Vite Proxy Configuration for Pinecone (if CORS fails)
 * 
 * To use this:
 * 1. Copy this content to vite.config.ts (merge with existing config)
 * 2. Restart Vite dev server
 * 3. Update client.ts indexHost to use '/pinecone-api'
 */

import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    proxy: {
      // Proxy Pinecone API requests to avoid CORS
      '/pinecone-api': {
        target: 'https://multi-agent-platform-aped-4627-b74a.svc.pinecone.io',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/pinecone-api/, ''),
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            // Add Pinecone API key from environment
            proxyReq.setHeader('Api-Key', process.env.VITE_PINECONE_API_KEY || '');
            proxyReq.setHeader('X-Pinecone-API-Version', '2024-07');
          });
        }
      }
    }
  }
});

/**
 * Then update client.ts:
 * 
 * constructor(apiKey?: string, environment?: string) {
 *   // ... existing code ...
 *   
 *   // Use proxy in development to avoid CORS
 *   if (import.meta.env.DEV) {
 *     this.indexHost = '/pinecone-api';
 *   } else {
 *     this.indexHost = `https://${this.indexName}-${this.environment}.svc.pinecone.io`;
 *   }
 * }
 */


