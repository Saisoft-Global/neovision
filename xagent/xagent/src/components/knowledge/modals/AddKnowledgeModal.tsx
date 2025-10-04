import React, { useState } from 'react';
import { X, Link, FileText, AlertCircle } from 'lucide-react';
import { useKnowledgeStore } from '../../../store/knowledgeStore';
import { URLKnowledgeService } from '../../../services/knowledge/URLKnowledgeService';
import { ValidationStatus } from '../validation/ValidationStatus';
import { KnowledgeValidator } from '../../../services/validation/KnowledgeValidator';
import type { Document } from '../../../types/document';

interface AddKnowledgeModalProps {
  onClose: () => void;
}

export const AddKnowledgeModal: React.FC<AddKnowledgeModalProps> = ({ onClose }) => {
  const { addKnowledge } = useKnowledgeStore();
  const [selectedType, setSelectedType] = useState<'text' | 'url'>('text');
  const [content, setContent] = useState('');
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [addedDocument, setAddedDocument] = useState<Document | null>(null);
  const [validationResult, setValidationResult] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      let document;
      if (selectedType === 'text') {
        document = await addKnowledge(content);
      } else if (selectedType === 'url') {
        const urlService = new URLKnowledgeService();
        document = await urlService.importFromURL(url);
      }

      if (document) {
        setAddedDocument(document);
        const validator = new KnowledgeValidator();
        const validation = await validator.validateKnowledge(document);
        setValidationResult(validation.details);
      }
    } catch (err) {
      console.error('Failed to add knowledge:', err);
      setError(err instanceof Error ? err.message : 'Failed to add knowledge');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Add Knowledge</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-6">
          <div className="flex space-x-4">
            <button
              onClick={() => setSelectedType('text')}
              className={`flex items-center px-4 py-2 rounded-lg ${
                selectedType === 'text'
                  ? 'bg-blue-50 text-blue-600 border-2 border-blue-600'
                  : 'border-2 border-gray-200'
              }`}
            >
              <FileText className="w-5 h-5 mr-2" />
              <span>Text</span>
            </button>
            <button
              onClick={() => setSelectedType('url')}
              className={`flex items-center px-4 py-2 rounded-lg ${
                selectedType === 'url'
                  ? 'bg-blue-50 text-blue-600 border-2 border-blue-600'
                  : 'border-2 border-gray-200'
              }`}
            >
              <Link className="w-5 h-5 mr-2" />
              <span>URL</span>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {selectedType === 'text' ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Content
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full h-40 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter or paste content..."
                required
              />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                URL
              </label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://example.com/article"
                required
              />
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 rounded-lg flex items-start space-x-2">
              <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          {addedDocument && validationResult && (
            <div className="mt-4 p-4 border-t">
              <ValidationStatus
                document={addedDocument}
                validationResult={validationResult}
                isValidating={false}
                onValidate={async () => {
                  const validator = new KnowledgeValidator();
                  const validation = await validator.validateKnowledge(addedDocument);
                  setValidationResult(validation.details);
                }}
              />
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:text-gray-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300"
            >
              {isLoading ? 'Adding...' : 'Add Knowledge'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};