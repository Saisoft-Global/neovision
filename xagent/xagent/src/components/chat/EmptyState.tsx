import React from 'react';
import { Bot } from 'lucide-react';

export const EmptyState: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-[calc(100vh-12rem)] bg-white rounded-lg shadow-md">
    <Bot className="w-16 h-16 text-gray-300 mb-4" />
    <h3 className="text-lg font-medium text-gray-900">No Agent Selected</h3>
    <p className="mt-2 text-sm text-gray-500">
      Select an agent from the list to start chatting
    </p>
  </div>
);