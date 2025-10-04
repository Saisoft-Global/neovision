import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Bot, MessageSquare, FileText, Settings, Users, Brain, GitGraph, Sparkles } from 'lucide-react';

export const Navigation: React.FC = () => {
  const location = useLocation();
  
  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="fixed left-0 top-0 h-full w-64 bg-white border-r shadow-sm py-8 px-4">
      <div className="flex items-center gap-3 px-4 mb-8">
        <Bot className="w-8 h-8 text-blue-600" />
        <h1 className="text-xl font-bold">Multi-Agent Platform</h1>
      </div>

      <div className="space-y-2">
        <Link
          to="/"
          className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
            isActive('/') ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50'
          }`}
        >
          <MessageSquare className="w-5 h-5" />
          <span>Chat</span>
        </Link>

        <Link
          to="/agents"
          className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
            isActive('/agents') ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50'
          }`}
        >
          <Users className="w-5 h-5" />
          <span>Agents</span>
        </Link>

        <Link
          to="/ai-agent"
          className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
            isActive('/ai-agent') ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50'
          }`}
        >
          <Sparkles className="w-5 h-5" />
          <span>AI Agent</span>
        </Link>

        <Link
          to="/knowledge"
          className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
            isActive('/knowledge') ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50'
          }`}
        >
          <Brain className="w-5 h-5" />
          <span>Knowledge Base</span>
        </Link>

        <Link
          to="/workflows"
          className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
            isActive('/workflows') ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50'
          }`}
        >
          <GitGraph className="w-5 h-5" />
          <span>Workflows</span>
        </Link>

        <Link
          to="/admin"
          className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
            isActive('/admin') ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50'
          }`}
        >
          <Settings className="w-5 h-5" />
          <span>Admin</span>
        </Link>
      </div>
    </nav>
  );
};