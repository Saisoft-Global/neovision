import React from 'react';
import { Bot, Settings } from 'lucide-react';
import { OrganizationSelector } from '../organization/OrganizationSelector';

interface HeaderProps {
  showAdmin: boolean;
  onToggleAdmin: () => void;
}

export const Header: React.FC<HeaderProps> = ({ showAdmin, onToggleAdmin }) => (
  <header className="bg-white shadow-sm sticky top-0 z-10">
    <div className="max-w-7xl mx-auto px-4 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Bot className="w-8 h-8 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">Multi-Agent Platform</h1>
        </div>
        <div className="flex items-center space-x-4">
          <OrganizationSelector />
          <button
            onClick={onToggleAdmin}
            className={`p-2 rounded-lg transition-colors ${
              showAdmin ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'
            }`}
            title="Settings"
          >
            <Settings className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  </header>
);