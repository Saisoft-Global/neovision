/**
 * Mobile Navigation Component
 * Bottom navigation for mobile devices
 */
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MessageSquare, Users, Brain, GitGraph, Menu, X, Settings, LogOut, Home, FileText, Calendar, Zap, Cpu, Wrench } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

export const MobileNav: React.FC = () => {
  const location = useLocation();
  const { logout, user } = useAuthStore();
  const [showMenu, setShowMenu] = useState(false);
  
  const isActive = (path: string) => location.pathname === path;

  const mainNavItems = [
    { path: '/', icon: Home, label: 'Dashboard' },
    { path: '/chat', icon: MessageSquare, label: 'Chat' },
    { path: '/agents', icon: Users, label: 'Agents' },
    { path: '/knowledge', icon: Brain, label: 'Knowledge' },
  ];

  return (
    <>
      {/* Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 glass-card border-t border-white/20 z-50 safe-bottom">
        <div className="flex justify-around items-center h-16 px-2">
          {mainNavItems.map(({ path, icon: Icon, label }) => (
            <Link
              key={path}
              to={path}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-all duration-300 ${
                isActive(path)
                  ? 'text-white'
                  : 'text-white/60'
              }`}
            >
              <Icon className={`w-6 h-6 mb-1 ${isActive(path) ? 'scale-110' : ''}`} />
              <span className="text-xs font-medium">{label}</span>
              {isActive(path) && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-white rounded-t-full" />
              )}
            </Link>
          ))}
          
          {/* Menu Button */}
          <button
            onClick={() => setShowMenu(true)}
            className="flex flex-col items-center justify-center flex-1 h-full text-white/60 active:text-white transition-colors"
          >
            <Menu className="w-6 h-6 mb-1" />
            <span className="text-xs font-medium">More</span>
          </button>
        </div>
      </nav>

      {/* Full Screen Menu Overlay */}
      {showMenu && (
        <div className="md:hidden fixed inset-0 z-[100] animate-in fade-in duration-200">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowMenu(false)}
          />
          
          {/* Menu Panel */}
          <div className="absolute bottom-0 left-0 right-0 glass-card rounded-t-3xl p-6 animate-in slide-in-from-bottom duration-300">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-white">Menu</h2>
                {user && (
                  <p className="text-sm text-white/60">{user.email}</p>
                )}
              </div>
              <button
                onClick={() => setShowMenu(false)}
                className="p-2 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Menu Items */}
            <div className="space-y-2 mb-6">
              <Link
                to="/workflows"
                onClick={() => setShowMenu(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-white/70 hover:bg-white/10 hover:text-white transition-colors"
              >
                <GitGraph className="w-5 h-5" />
                <span className="font-medium">Workflows</span>
              </Link>
              
              <Link
                to="/documents"
                onClick={() => setShowMenu(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-white/70 hover:bg-white/10 hover:text-white transition-colors"
              >
                <FileText className="w-5 h-5" />
                <span className="font-medium">Documents</span>
              </Link>
              
              <Link
                to="/meetings"
                onClick={() => setShowMenu(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-white/70 hover:bg-white/10 hover:text-white transition-colors"
              >
                <Calendar className="w-5 h-5" />
                <span className="font-medium">Meetings</span>
              </Link>
              
              <Link
                to="/automation"
                onClick={() => setShowMenu(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-white/70 hover:bg-white/10 hover:text-white transition-colors"
              >
                <Zap className="w-5 h-5" />
                <span className="font-medium">Automation</span>
              </Link>
              
              <Link
                to="/llm-config"
                onClick={() => setShowMenu(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-white/70 hover:bg-white/10 hover:text-white transition-colors"
              >
                <Cpu className="w-5 h-5" />
                <span className="font-medium">LLM Config</span>
              </Link>
              
              <Link
                to="/agent-builder"
                onClick={() => setShowMenu(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-white/70 hover:bg-white/10 hover:text-white transition-colors"
              >
                <Wrench className="w-5 h-5" />
                <span className="font-medium">Agent Builder</span>
              </Link>
              
              <Link
                to="/settings"
                onClick={() => setShowMenu(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-white/70 hover:bg-white/10 hover:text-white transition-colors"
              >
                <Settings className="w-5 h-5" />
                <span className="font-medium">Settings</span>
              </Link>
              
              <Link
                to="/admin"
                onClick={() => setShowMenu(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-white/80 hover:bg-white/10 hover:text-white transition-all"
              >
                <Settings className="w-5 h-5" />
                <span className="font-medium">Admin</span>
              </Link>
            </div>

            {/* Logout Button */}
            <button
              onClick={() => {
                logout();
                setShowMenu(false);
              }}
              className="flex items-center gap-3 px-4 py-3 rounded-xl w-full text-red-400 hover:bg-red-500/10 transition-all"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
};
