import { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { ConnectionStatus } from './components/common/ConnectionStatus';
import { AppRoutes } from './routes';
import { ConversationManager } from './services/conversation/ConversationManager';
import { OrganizationInitializer } from './components/organization/OrganizationInitializer';
import { initializeAdvancedPromptSystem } from './services/prompts';
import { useAgentStore } from './store/agentStore';

export const App = () => {
  const ensureDefaultAgent = useAgentStore((state) => state.ensureDefaultAgent);

  useEffect(() => {
    // Initialize conversation management system
    const conversationManager = ConversationManager.getInstance();
    conversationManager.initialize();

    // Initialize advanced prompt system
    initializeAdvancedPromptSystem();

    // Ensure default agent is selected on first run
    ensureDefaultAgent().catch(err => {
      console.warn('Failed to auto-select default agent:', err);
    });

    // Cleanup on unmount
    return () => {
      conversationManager.shutdown();
    };
  }, [ensureDefaultAgent]);

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-100">
        <OrganizationInitializer />
        <AppRoutes />
        <ConnectionStatus />
      </div>
    </BrowserRouter>
  );
};