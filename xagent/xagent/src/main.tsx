import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { SupabaseProvider } from './providers/SupabaseProvider';
import { AuthProvider } from './providers/AuthProvider';
import { App } from './App';
import './index.css';

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

createRoot(root).render(
  <StrictMode>
    <SupabaseProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </SupabaseProvider>
  </StrictMode>
);