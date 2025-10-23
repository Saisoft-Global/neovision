import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Bot, MessageSquare, FileText, Settings, Users, Brain, GitGraph, Sparkles, LogOut, Wrench, Home, Calendar, Zap, Cpu, Shield } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

export const Navigation: React.FC = () => {
  const location = useLocation();
  const { logout, user } = useAuthStore();
  
  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="hidden md:block fixed left-0 top-0 h-full w-64 glass-card border-r border-white/20 py-8 px-4 z-50">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 mb-8">
        <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg">
          <Bot className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-white">Multi-Agent</h1>
          <p className="text-xs text-white/60">AI Platform</p>
        </div>
      </div>

      {/* User Info */}
      {user && (
        <div className="px-4 py-3 mb-6 rounded-xl bg-white/10 backdrop-blur-sm">
          <p className="text-sm font-medium text-white truncate">{user.email}</p>
          <p className="text-xs text-white/60 capitalize">{user.role}</p>
        </div>
      )}

      {/* Navigation Links */}
      <div className="space-y-2">
        <Link
          to="/"
          className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
            isActive('/') 
              ? 'bg-white/20 text-white shadow-lg scale-105' 
              : 'text-white/70 hover:bg-white/10 hover:text-white'
          }`}
        >
          <Home className="w-5 h-5" />
          <span className="font-medium">Dashboard</span>
        </Link>

        <Link
          to="/chat"
          className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
            isActive('/chat') 
              ? 'bg-white/20 text-white shadow-lg scale-105' 
              : 'text-white/70 hover:bg-white/10 hover:text-white'
          }`}
        >
          <MessageSquare className="w-5 h-5" />
          <span className="font-medium">Chat</span>
        </Link>

        <Link
          to="/agents"
          className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
            isActive('/agents') 
              ? 'bg-white/20 text-white shadow-lg scale-105' 
              : 'text-white/70 hover:bg-white/10 hover:text-white'
          }`}
        >
          <Users className="w-5 h-5" />
          <span className="font-medium">Agents</span>
        </Link>

        <Link
          to="/ai-agent"
          className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
            isActive('/ai-agent') 
              ? 'bg-white/20 text-white shadow-lg scale-105' 
              : 'text-white/70 hover:bg-white/10 hover:text-white'
          }`}
        >
          <Sparkles className="w-5 h-5" />
          <span className="font-medium">AI Agent</span>
        </Link>

        <Link
          to="/knowledge"
          className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
            isActive('/knowledge') 
              ? 'bg-white/20 text-white shadow-lg scale-105' 
              : 'text-white/70 hover:bg-white/10 hover:text-white'
          }`}
        >
          <Brain className="w-5 h-5" />
          <span className="font-medium">Knowledge Base</span>
        </Link>

        <Link
          to="/workflows"
          className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
            isActive('/workflows') 
              ? 'bg-white/20 text-white shadow-lg scale-105' 
              : 'text-white/70 hover:bg-white/10 hover:text-white'
          }`}
        >
          <GitGraph className="w-5 h-5" />
          <span className="font-medium">Workflows</span>
        </Link>

        <Link
          to="/agent-builder"
          className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
            isActive('/agent-builder') 
              ? 'bg-white/20 text-white shadow-lg scale-105' 
              : 'text-white/70 hover:bg-white/10 hover:text-white'
          }`}
        >
          <Wrench className="w-5 h-5" />
          <span className="font-medium">Agent Builder</span>
        </Link>

        <Link
          to="/documents"
          className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
            isActive('/documents') 
              ? 'bg-white/20 text-white shadow-lg scale-105' 
              : 'text-white/70 hover:bg-white/10 hover:text-white'
          }`}
        >
          <FileText className="w-5 h-5" />
          <span className="font-medium">Documents</span>
        </Link>

        <Link
          to="/meetings"
          className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
            isActive('/meetings') 
              ? 'bg-white/20 text-white shadow-lg scale-105' 
              : 'text-white/70 hover:bg-white/10 hover:text-white'
          }`}
        >
          <Calendar className="w-5 h-5" />
          <span className="font-medium">Meetings</span>
        </Link>

        <Link
          to="/automation"
          className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
            isActive('/automation') 
              ? 'bg-white/20 text-white shadow-lg scale-105' 
              : 'text-white/70 hover:bg-white/10 hover:text-white'
          }`}
        >
          <Zap className="w-5 h-5" />
          <span className="font-medium">Automation</span>
        </Link>

        <Link
          to="/llm-config"
          className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
            isActive('/llm-config') 
              ? 'bg-white/20 text-white shadow-lg scale-105' 
              : 'text-white/70 hover:bg-white/10 hover:text-white'
          }`}
        >
          <Cpu className="w-5 h-5" />
          <span className="font-medium">LLM Config</span>
        </Link>

        <Link
          to="/settings"
          className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
            isActive('/settings') 
              ? 'bg-white/20 text-white shadow-lg scale-105' 
              : 'text-white/70 hover:bg-white/10 hover:text-white'
          }`}
        >
          <Settings className="w-5 h-5" />
          <span className="font-medium">Settings</span>
        </Link>

        <Link
          to="/admin"
          className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
            isActive('/admin') 
              ? 'bg-white/20 text-white shadow-lg scale-105' 
              : 'text-white/70 hover:bg-white/10 hover:text-white'
          }`}
        >
          <Shield className="w-5 h-5" />
          <span className="font-medium">Admin</span>
        </Link>
      </div>

      {/* Logout Button */}
      <div className="absolute bottom-8 left-4 right-4">
        <button
          onClick={() => logout()}
          className="flex items-center gap-3 px-4 py-3 rounded-xl w-full text-white/70 hover:bg-white/10 hover:text-white transition-all duration-300"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </nav>
  );
};