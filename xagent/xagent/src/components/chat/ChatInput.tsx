import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, X } from 'lucide-react';
import { ModernButton } from '../ui/ModernButton';
import { cn } from '../../utils/cn';

interface ChatInputProps {
  onSendMessage: (message: string, file?: File) => void;
  disabled?: boolean;
  loading?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ 
  onSendMessage, 
  disabled,
  loading 
}) => {
  const [input, setInput] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [input]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((input.trim() || selectedFile) && !disabled && !loading) {
      onSendMessage(input.trim(), selectedFile || undefined);
      setInput('');
      setSelectedFile(null);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && !disabled) {
      setSelectedFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  return (
    <form 
      onSubmit={handleSubmit}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      className="border-t border-white/20 p-4 md:p-6"
    >
      {/* Selected File Preview */}
      {selectedFile && (
        <div className="mb-3 flex items-center gap-3 px-4 py-3 glass-card rounded-xl animate-in slide-in-from-bottom-2 duration-200">
          <Paperclip className="w-4 h-4 text-white flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="text-sm text-white font-medium truncate block">{selectedFile.name}</span>
            <span className="text-xs text-white/60">
              {(selectedFile.size / 1024).toFixed(1)} KB
            </span>
          </div>
          <button
            type="button"
            onClick={handleRemoveFile}
            className="text-white/60 hover:text-white transition-colors flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      <div className="flex items-end gap-2 md:gap-3">
        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          className="hidden"
          accept=".pdf,.doc,.docx,.txt,.csv,.xlsx,.xls,.jpg,.jpeg,.png"
          disabled={disabled}
        />
        
        {/* Attach Button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          className="flex-shrink-0 p-3 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed touch-target"
          title="Attach file"
        >
          <Paperclip className="w-5 h-5" />
        </button>

        {/* Text Input with Auto-resize */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder={disabled ? 'Agent is unavailable' : selectedFile ? 'Add a message (optional)...' : 'Type your message...'}
            disabled={disabled}
            rows={1}
            className={cn(
              'w-full px-4 py-3 pr-12 rounded-xl resize-none',
              'bg-white/90 backdrop-blur-sm border-2 border-white/20',
              'focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/20',
              'transition-all duration-300 outline-none',
              'text-gray-800 placeholder-gray-400',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'text-sm md:text-base'
            )}
            style={{ maxHeight: '150px' }}
          />
          
          {/* Character Count */}
          {input.length > 0 && (
            <div className="absolute bottom-2 right-2 text-xs text-gray-400 bg-white/80 px-2 py-1 rounded">
              {input.length}
            </div>
          )}
        </div>

        {/* Send Button */}
        <ModernButton
          type="submit"
          disabled={disabled || (!input.trim() && !selectedFile) || loading}
          loading={loading}
          variant="primary"
          size="md"
          className="flex-shrink-0 touch-target"
          icon={<Send className="w-5 h-5" />}
        >
          <span className="hidden md:inline">Send</span>
        </ModernButton>
      </div>

      {/* Hints */}
      <div className="mt-3 flex items-center justify-between text-xs text-white/50">
        <span>Press Enter to send, Shift+Enter for new line</span>
        <span className="hidden md:inline">✨ Powered by AI</span>
      </div>
    </form>
  );
};