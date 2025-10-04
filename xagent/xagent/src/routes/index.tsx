import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import LoginForm from '../components/auth/LoginForm';
import UnauthorizedPage from '../components/auth/UnauthorizedPage';
import ProtectedRoute from '../components/auth/ProtectedRoute';
import { AgentsPage } from '../components/pages/AgentsPage';
import { ChatPage } from '../components/pages/ChatPage';
import { KnowledgeBasePage } from '../components/pages/KnowledgeBasePage';
import { WorkflowDesignerPage } from '../components/workflow/WorkflowDesignerPage';
import { AIAgentPage } from '../components/pages/AIAgentPage';
import AdminDashboard from '../components/dashboard/AdminDashboard';

export const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginForm />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />
      
      <Route path="/" element={
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
        <ProtectedRoute requiredPermission="admin:access">
          <Layout>
            <AdminDashboard />
          </Layout>
        </ProtectedRoute>
      } />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};