import React, { useState } from 'react';
import { FileText, Loader, AlertCircle } from 'lucide-react';
import { useKnowledgeStore } from '../../../store/knowledgeStore';

interface TextInputProps {
  onSuccess: () => void;
  onError: (error: string) => void;
}

export const TextInput: React.FC<TextInputProps> = ({ onSuccess, onError }) => {
  const [content, setContent] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { addKnowledge } = useKnowledgeStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || isProcessing) return;

    setIsProcessing(true);
    setError(null);

    try {
      await addKnowledge(content);
      setContent('');
      onSuccess();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add text';
      setError(message);
      onError(message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <div className="absolute top-3 left-3">
            <FileText className="w-5 h-5 text-gray-400" />
          </div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Enter or paste text to add to knowledge base..."
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[120px]"
            required
          />
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isProcessing || !content.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center space-x-2 min-w-[120px] justify-center"
          >
            {isProcessing ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                <span>Processing</span>
              </>
            ) : (
              <span>Add Text</span>
            )}
          </button>
        </div>
      </form>

      {error && (
        <div className="flex items-start space-x-2 text-red-600 bg-red-50 p-3 rounded-lg">
          <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}
    </div>
  );
};