import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import LoginForm from '../components/auth/LoginForm';
import { ProtectedRoute, PublicRoute } from '../components/auth/ProtectedRoute';
import { UnauthorizedPage } from '../components/pages/UnauthorizedPage';

// Lazy load pages for better performance
const AgentsPage = lazy(() => import('../components/pages/AgentsPage').then(m => ({ default: m.AgentsPage })));
const ChatPage = lazy(() => import('../components/pages/ChatPage').then(m => ({ default: m.ChatPage })));
const KnowledgeBasePage = lazy(() => import('../components/pages/KnowledgeBasePage').then(m => ({ default: m.KnowledgeBasePage })));
const WorkflowDesignerPage = lazy(() => import('../components/workflow/WorkflowDesignerPage').then(m => ({ default: m.WorkflowDesignerPage })));
const AIAgentPage = lazy(() => import('../components/pages/AIAgentPage').then(m => ({ default: m.AIAgentPage })));
const AdminDashboard = lazy(() => import('../components/dashboard/AdminDashboard'));
const SupabaseConnectionTest = lazy(() => import('../components/test/SupabaseConnectionTest').then(m => ({ default: m.SupabaseConnectionTest })));
const UniversalChatPage = lazy(() => import('../components/pages/UniversalChatPage').then(m => ({ default: m.UniversalChatPage })));
const SimpleChatPage = lazy(() => import('../components/pages/SimpleChatPage').then(m => ({ default: m.SimpleChatPage })));
const EmailConfigurationPanel = lazy(() => import('../components/settings/EmailConfigurationPanel').then(m => ({ default: m.EmailConfigurationPanel })));
const AgentBuilderPage = lazy(() => import('../components/pages/AgentBuilderPage').then(m => ({ default: m.AgentBuilderPage })));
const SimpleAgentBuilderPage = lazy(() => import('../components/pages/SimpleAgentBuilderPage').then(m => ({ default: m.SimpleAgentBuilderPage })));
const SettingsPage = lazy(() => import('../components/pages/SettingsPage').then(m => ({ default: m.SettingsPage })));
const DashboardPage = lazy(() => import('../components/pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const DocumentsPage = lazy(() => import('../components/pages/DocumentsPage').then(m => ({ default: m.DocumentsPage })));
const LLMConfigPage = lazy(() => import('../components/pages/LLMConfigPage').then(m => ({ default: m.LLMConfigPage })));
const MeetingPage = lazy(() => import('../components/pages/MeetingPage').then(m => ({ default: m.MeetingPage })));
const AutomationPage = lazy(() => import('../components/pages/AutomationPage').then(m => ({ default: m.AutomationPage })));
const GoogleOAuthCallback = lazy(() => import('../components/oauth/GoogleOAuthCallback').then(m => ({ default: m.GoogleOAuthCallback })));
const MicrosoftOAuthCallback = lazy(() => import('../components/oauth/MicrosoftOAuthCallback').then(m => ({ default: m.MicrosoftOAuthCallback })));
const ZohoOAuthCallback = lazy(() => import('../components/oauth/ZohoOAuthCallback').then(m => ({ default: m.ZohoOAuthCallback })));
const YahooOAuthCallback = lazy(() => import('../components/oauth/YahooOAuthCallback').then(m => ({ default: m.YahooOAuthCallback })));

// Loading component
const PageLoader = () => (
  <div className="flex items-center justify-center h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
  </div>
);

export const AppRoutes = () => {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/login" element={
          <PublicRoute>
            <LoginForm />
          </PublicRoute>
        } />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />
        
        <Route path="/" element={
          <ProtectedRoute>
            <Layout>
              <DashboardPage />
            </Layout>
          </ProtectedRoute>
        } />

        <Route path="/chat" element={
          <ProtectedRoute>
            <Layout>
              <ChatPage />
            </Layout>
          </ProtectedRoute>
        } />

      <Route path="/agents" element={
        <ProtectedRoute>
          <Layout>
            <AgentsPage />
          </Layout>
        </ProtectedRoute>
      } />

      <Route path="/knowledge" element={
        <ProtectedRoute>
          <Layout>
            <KnowledgeBasePage />
          </Layout>
        </ProtectedRoute>
      } />

      <Route path="/workflows" element={
        <ProtectedRoute>
          <Layout>
            <WorkflowDesignerPage />
          </Layout>
        </ProtectedRoute>
      } />

      <Route path="/ai-agent" element={
        <ProtectedRoute>
          <Layout>
            <AIAgentPage />
          </Layout>
        </ProtectedRoute>
      } />

      <Route path="/admin" element={
        <ProtectedRoute requiredRole="admin">
          <Layout>
            <AdminDashboard />
          </Layout>
        </ProtectedRoute>
      } />

      {/* Test route - accessible without auth for debugging */}
      <Route path="/test/supabase" element={<SupabaseConnectionTest />} />

      {/* Universal Chat - accessible without auth for testing */}
      <Route path="/universal-chat" element={<UniversalChatPage />} />

      {/* Simple Chat - working version without complex orchestrator */}
      <Route path="/simple-chat" element={<SimpleChatPage />} />

      {/* Settings */}
      <Route path="/settings" element={
        <ProtectedRoute>
          <Layout>
            <SettingsPage />
          </Layout>
        </ProtectedRoute>
      } />

      {/* Email Configuration Settings - Legacy route */}
      <Route path="/settings/email" element={<EmailConfigurationPanel />} />

      {/* Agent Builder */}
      <Route path="/agent-builder" element={
        <ProtectedRoute>
          <Layout>
            <AgentBuilderPage />
          </Layout>
        </ProtectedRoute>
      } />

      {/* Simple Agent Builder (Lyzr-style) */}
      <Route path="/agent-builder/simple" element={
        <ProtectedRoute>
          <Layout>
            <SimpleAgentBuilderPage />
          </Layout>
        </ProtectedRoute>
      } />

      {/* Documents Management */}
      <Route path="/documents" element={
        <ProtectedRoute>
          <Layout>
            <DocumentsPage />
          </Layout>
        </ProtectedRoute>
      } />

      {/* LLM Configuration */}
      <Route path="/llm-config" element={
        <ProtectedRoute>
          <Layout>
            <LLMConfigPage />
          </Layout>
        </ProtectedRoute>
      } />

      {/* Meeting Scheduler */}
      <Route path="/meetings" element={
        <ProtectedRoute>
          <Layout>
            <MeetingPage />
          </Layout>
        </ProtectedRoute>
      } />

      {/* Browser Automation */}
      <Route path="/automation" element={
        <ProtectedRoute>
          <Layout>
            <AutomationPage />
          </Layout>
        </ProtectedRoute>
      } />

        {/* OAuth Callbacks */}
        <Route path="/oauth/google/callback" element={<GoogleOAuthCallback />} />
        <Route path="/oauth/microsoft/callback" element={<MicrosoftOAuthCallback />} />
        <Route path="/oauth/zoho/callback" element={<ZohoOAuthCallback />} />
        <Route path="/oauth/yahoo/callback" element={<YahooOAuthCallback />} />

      <Route path="*" element={<Navigate to="/" replace />      } />
      </Routes>
    </Suspense>
  );
};