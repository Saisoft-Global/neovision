import React, { useRef, useEffect } from 'react';
import { MessageBubble } from './MessageBubble';
import type { Message } from '../../types/agent';

interface MessageThreadProps {
  messages: Message[];
}

export const MessageThread: React.FC<MessageThreadProps> = ({ messages }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scrollToBottom = () => {
      if (messagesEndRef.current && scrollContainerRef.current) {
        const container = scrollContainerRef.current;
        const isScrolledNearBottom = 
          container.scrollHeight - container.scrollTop - container.clientHeight < 100;

        if (isScrolledNearBottom) {
          messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
      }
    };

    scrollToBottom();
  }, [messages]);

  return (
    <div 
      ref={scrollContainerRef}
      className="h-full overflow-y-auto px-4 py-3 space-y-4 scroll-smooth"
    >
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
};