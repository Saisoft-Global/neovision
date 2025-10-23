import React from 'react';
import SimpleUniversalChat from '../chat/SimpleUniversalChat';
import { MessageSquare } from 'lucide-react';

export const SimpleChatPage: React.FC = () => {
  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600">
            <MessageSquare className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white">Simple AI Chat</h1>
        </div>
        <p className="text-white/60 text-sm md:text-base">
          💬 A simplified chat interface that works reliably without complex routing.
        </p>
      </div>
      <SimpleUniversalChat className="h-[calc(100vh-12rem)]" />
    </div>
  );
};
