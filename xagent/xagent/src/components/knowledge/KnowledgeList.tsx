import React from 'react';
import { FileText, Calendar, Brain, Sparkles } from 'lucide-react';
import { format, isValid, parseISO } from 'date-fns';
import type { Document } from '../../types/document';
import { DocumentStatus } from '../documents/DocumentStatus';
import { ModernCard } from '../ui/ModernCard';
import { Skeleton } from '../ui/Skeleton';
import { useKnowledgeStore } from '../../store/knowledgeStore';

interface KnowledgeListProps {
  documents?: Document[];
}

export const KnowledgeList: React.FC<KnowledgeListProps> = ({ documents = [] }) => {
  const { isLoading } = useKnowledgeStore();

  const formatDate = (dateString: string): string => {
    try {
      const date = parseISO(dateString);
      if (!isValid(date)) {
        return 'Invalid date';
      }
      return format(date, 'PPp');
    } catch (error) {
      console.error('Date formatting error:', error);
      return 'Invalid date';
    }
  };

  // Show loading skeletons
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <ModernCard key={i} variant="glass">
            <div className="flex items-start gap-4">
              <Skeleton variant="circular" width="48px" height="48px" />
              <div className="flex-1 space-y-2">
                <Skeleton variant="text" width="60%" />
                <Skeleton variant="text" width="100%" />
                <Skeleton variant="text" width="40%" />
              </div>
            </div>
          </ModernCard>
        ))}
      </div>
    );
  }

  // Empty state
  if (!documents?.length) {
    return (
      <ModernCard variant="glass" className="text-center py-12">
        <div className="flex flex-col items-center gap-4">
          <div className="p-6 glass-card rounded-2xl">
            <Brain className="w-16 h-16 text-white mx-auto" />
          </div>
          <h3 className="text-2xl font-bold text-white">No Documents Yet</h3>
          <p className="text-white/60 max-w-md">
            Your knowledge base is empty. Upload documents, add URLs, or paste text to start building your AI knowledge.
          </p>
          <div className="mt-4 flex flex-wrap gap-3 justify-center">
            <div className="glass-card px-4 py-2 rounded-xl">
              <span className="text-sm text-white">📄 Upload PDFs</span>
            </div>
            <div className="glass-card px-4 py-2 rounded-xl">
              <span className="text-sm text-white">🔗 Add URLs</span>
            </div>
            <div className="glass-card px-4 py-2 rounded-xl">
              <span className="text-sm text-white">📝 Paste Text</span>
            </div>
          </div>
        </div>
      </ModernCard>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats Header */}
      <ModernCard variant="glass" className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-sm text-white/60">Total Documents</p>
            <p className="text-2xl font-bold text-white">{documents.length}</p>
          </div>
        </div>
      </ModernCard>

      {/* Document List */}
      {documents.map((doc) => (
        <ModernCard key={doc.id} variant="glass" hover>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4 flex-1 min-w-0">
              <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex-shrink-0">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-white text-lg mb-1 truncate">{doc.title}</h3>
                <p className="text-sm text-white/70 line-clamp-2 mb-3">
                  {doc.content?.substring(0, 150)}...
                </p>
                <div className="flex items-center gap-4 text-xs text-white/50">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <time>
                      {doc.created_at ? 
                        formatDate(doc.created_at) : 
                        doc.metadata?.uploadedAt ?
                        formatDate(doc.metadata.uploadedAt) :
                        'Date not available'
                      }
                    </time>
                  </div>
                  {doc.doc_type && (
                    <span className="px-2 py-1 glass-card rounded-lg capitalize">
                      {doc.doc_type.replace('_', ' ')}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <DocumentStatus document={doc} />
          </div>
        </ModernCard>
      ))}
    </div>
  );
};