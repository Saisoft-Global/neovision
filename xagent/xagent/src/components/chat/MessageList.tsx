import React from 'react';
import { format } from 'date-fns';
import type { Message } from '../../types/agent';

interface MessageListProps {
  messages: Message[];
}

export const MessageList: React.FC<MessageListProps> = ({ messages }) => (
  <div className="flex-1 overflow-y-auto p-4 space-y-4">
    {messages.length === 0 ? (
      <div className="text-center py-8 text-gray-500">
        No messages yet. Start a conversation!
      </div>
    ) : (
      messages.map((message) => (
        <div
          key={message.id}
          className={`flex ${
            message.senderId === 'user' ? 'justify-end' : 'justify-start'
          }`}
        >
          <div
            className={`max-w-[70%] rounded-lg p-3 ${
              message.senderId === 'user'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100'
            }`}
          >
            <p className="whitespace-pre-wrap break-words">{message.content}</p>
            <span className="text-xs opacity-75 mt-1 block">
              {format(message.timestamp, 'HH:mm')}
            </span>
          </div>
        </div>
      ))
    )}
  </div>
);