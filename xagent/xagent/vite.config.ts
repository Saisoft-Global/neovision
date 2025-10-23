import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  define: {
    'process.env': {},
    'global': 'globalThis',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'process': 'process/browser',
      'buffer': 'buffer',
      'events': 'events',
      'stream': 'stream-browserify',
      'util': 'util',
    },
  },
  optimizeDeps: {
    exclude: ['robotjs', 'playwright-core', 'chromium-bidi'],
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'zustand',
      'lucide-react',
      'clsx',
      'tailwind-merge',
      'process',
      'buffer',
      'events',
      'stream-browserify',
      'util'
    ],
    esbuildOptions: {
      target: 'esnext',
      define: {
        global: 'globalThis'
      }
    }
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
          // Vendor chunks for better caching
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['lucide-react', '@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-select'],
          'state-vendor': ['zustand'],
          'chart-vendor': ['recharts'],
          'ai-vendor': ['openai'],
          'pdf-vendor': ['pdfjs-dist'],
          'utils-vendor': ['date-fns', 'clsx', 'tailwind-merge'],
        },
      },
      external: ['robotjs', 'playwright-core', 'chromium-bidi']
    },
    // Optimize chunk size
    chunkSizeWarningLimit: 1000,
    // Enable minification
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.logs in production
        drop_debugger: true,
      },
    },
    // Source maps - disable in production for security
    sourcemap: false,
  },
  publicDir: 'public',
});