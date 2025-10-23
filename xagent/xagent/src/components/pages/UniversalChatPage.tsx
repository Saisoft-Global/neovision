import React from 'react';
import UniversalChatContainer from '../chat/UniversalChatContainer';
import { Sparkles } from 'lucide-react';

export const UniversalChatPage: React.FC = () => {
  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white">Universal AI Assistant</h1>
        </div>
        <p className="text-white/60 text-sm md:text-base">
          ✨ Just type anything - I'll automatically route it to the right specialist agent!
        </p>
      </div>
      <UniversalChatContainer className="h-[calc(100vh-12rem)]" />
    </div>
  );
};
