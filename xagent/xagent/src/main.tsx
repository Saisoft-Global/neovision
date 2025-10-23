import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { SupabaseProvider } from './providers/SupabaseProvider';
import { AuthProvider } from './providers/AuthProvider';
import { App } from './App';
import './index.css';

// Initialize Tools & Skills Framework
import { initializeTools } from './services/initialization/toolsInitializer';

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

// Bootstrap app with async tool initialization
async function bootstrap() {
  console.log('🚀 Bootstrapping application...');
  
  // Initialize tools first (including dynamic tools from DB)
  await initializeTools();
  console.log('✅ Tools initialized, rendering app...');
  
  // Then render app
  createRoot(root).render(
    <StrictMode>
      <SupabaseProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </SupabaseProvider>
    </StrictMode>
  );
}

// Start bootstrap
bootstrap().catch(error => {
  console.error('❌ Bootstrap failed:', error);
  // Render app anyway (tools will load lazily)
  createRoot(root).render(
    <StrictMode>
      <SupabaseProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </SupabaseProvider>
    </StrictMode>
  );
});