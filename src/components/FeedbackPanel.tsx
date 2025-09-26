import React, { useState, useEffect } from 'react';
import { ThumbsUp, ThumbsDown, TrendingUp } from 'lucide-react';
import { submitFeedback, getFieldStatistics } from '../services/feedbackService';
import type { Field } from '../store/documentStore';

interface FieldFeedback {
  fieldId: string;
  rating: 'positive' | 'negative' | 'neutral';
  comment?: string;
  correction?: string;
        isCorrect: boolean;
  timestamp: string;
}

interface FeedbackPanelProps {
  documentId: string;
  fields: Field[];
  onFeedbackSubmit?: (feedback: FieldFeedback[]) => void;
}

interface FieldStats {
  accuracy: number;
  totalFeedback: number;
  trend: 'up' | 'down' | 'stable';
}

const FeedbackPanel: React.FC<FeedbackPanelProps> = ({
  documentId,
  fields,
  onFeedbackSubmit
}) => {
  const [feedback, setFeedback] = useState<{ [key: string]: FieldFeedback }>({});
  const [stats, setStats] = useState<{ [key: string]: FieldStats }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Load field statistics
    const loadStats = async () => {
      const fieldStats: { [key: string]: FieldStats } = {};
      for (const field of fields) {
        try {
          const stats = await getFieldStatistics(field.id);
          fieldStats[field.id] = {
            accuracy: stats.accuracy,
            totalFeedback: stats.total_corrections,
            trend: stats.trend || 'stable'
          };
        } catch (error) {
          console.error(`Error loading stats for field ${field.id}:`, error);
        }
      }
      setStats(fieldStats);
    };

    loadStats();
  }, [fields]);

  const handleFeedback = (fieldId: string, isCorrect: boolean) => {
    setFeedback(prev => ({
      ...prev,
      [fieldId]: {
        fieldId,
        rating: isCorrect ? 'positive' : 'negative',
        isCorrect,
        correction: prev[fieldId]?.correction,
        timestamp: new Date().toISOString()
      }
    }));
  };

  const handleCorrection = (fieldId: string, correction: string) => {
    setFeedback(prev => ({
      ...prev,
      [fieldId]: {
        ...prev[fieldId],
        fieldId,
        correction,
        rating: prev[fieldId]?.rating || 'neutral',
        isCorrect: prev[fieldId]?.isCorrect || false,
        timestamp: prev[fieldId]?.timestamp || new Date().toISOString()
      }
    }));
  };

  const handleSubmit = async () => {
    if (Object.keys(feedback).length === 0) return;

    setIsSubmitting(true);
    try {
      const feedbackArray = Object.values(feedback);
      await submitFeedback(documentId, feedbackArray);
      setFeedback({});
      onFeedbackSubmit?.(feedbackArray);
    } catch (error) {
      console.error('Error submitting feedback:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-96 bg-white border-l border-gray-200 p-4 overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Field Feedback</h3>
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || Object.keys(feedback).length === 0}
          className={`btn btn-primary text-sm ${
            (isSubmitting || Object.keys(feedback).length === 0) ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          Submit Feedback
        </button>
      </div>

      <div className="space-y-4">
        {fields.map((field) => (
          <div
            key={field.id}
            className="border rounded-lg p-3 space-y-2"
          >
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">
                {field.label}
              </label>
              <div className="flex gap-1">
                <button
                  onClick={() => handleFeedback(field.id, true)}
                  className={`p-1 rounded ${
                    feedback[field.id]?.isCorrect === true
                      ? 'bg-green-100 text-green-600'
                      : 'hover:bg-gray-100'
                  }`}
                  title="Correct"
                >
                  <ThumbsUp className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleFeedback(field.id, false)}
                  className={`p-1 rounded ${
                    feedback[field.id]?.isCorrect === false
                      ? 'bg-red-100 text-red-600'
                      : 'hover:bg-gray-100'
                  }`}
                  title="Incorrect"
                >
                  <ThumbsDown className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm">{field.value}</span>
              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                {(field.confidence * 100).toFixed(0)}%
              </span>
            </div>

            {feedback[field.id]?.isCorrect === false && (
              <input
                type="text"
                value={feedback[field.id]?.correction || ''}
                onChange={(e) => handleCorrection(field.id, e.target.value)}
                placeholder="Enter correction..."
                className="w-full mt-2 text-sm border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            )}

            {stats[field.id] && (
              <div className="flex items-center gap-2 text-xs text-gray-500 mt-2">
                <TrendingUp className={`w-4 h-4 ${
                  stats[field.id].trend === 'up' ? 'text-green-500' : 
                  stats[field.id].trend === 'down' ? 'text-red-500' : 
                  'text-gray-500'
                }`} />
                <span>{(stats[field.id].accuracy * 100).toFixed(1)}% accuracy</span>
                <span>({stats[field.id].totalFeedback} reviews)</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default FeedbackPanel;