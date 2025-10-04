import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    exclude: ['robotjs', 'playwright-core', 'chromium-bidi']
  },
  server: {
    hmr: {
      timeout: 0
    },
    host: true,
    port: 5173,
    open: true,
  },
  preview: {
    port: 5173,
    open: true,
    host: true,
  },
  build: {
    target: 'esnext',
    commonjsOptions: {
      exclude: ['robotjs', 'playwright-core', 'chromium-bidi']
    },
    rollupOptions: {
      output: {
        manualChunks: {
          pdfjs: ['pdfjs-dist'],
        },
      },
      external: ['robotjs', 'playwright-core', 'chromium-bidi']
    },
  },
  publicDir: 'public',
});