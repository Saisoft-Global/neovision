import React, { useState } from 'react';
import { ThumbsUp, ThumbsDown, MessageSquare } from 'lucide-react';
import type { FeedbackEntry } from '../../types/feedback';
import { FeedbackCollector as FeedbackService } from '../../services/feedback/FeedbackCollector';

interface FeedbackCollectorProps {
  entityId?: string;
  entityType: 'response' | 'workflow' | 'agent';
}

export const FeedbackCollector: React.FC<FeedbackCollectorProps> = ({
  entityId,
  entityType,
}) => {
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [showCommentBox, setShowCommentBox] = useState(false);

  const handleSubmit = async () => {
    if (rating === null) return;

    const feedback: Omit<FeedbackEntry, 'id' | 'timestamp'> = {
      type: `${entityType}_quality`,
      userId: 'current-user', // Replace with actual user ID
      score: rating,
      comments: comment,
    };

    if (entityId) {
      feedback[`${entityType}Id` as keyof typeof feedback] = entityId;
    }

    try {
      await FeedbackService.getInstance().collectFeedback(feedback);
      setRating(null);
      setComment('');
      setShowCommentBox(false);
    } catch (error) {
      console.error('Failed to submit feedback:', error);
    }
  };

  return (
    <div className="border-t mt-4 pt-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setRating(1)}
            className={`p-2 rounded-full transition-colors ${
              rating === 1 ? 'bg-green-100 text-green-600' : 'hover:bg-gray-100'
            }`}
          >
            <ThumbsUp className="w-5 h-5" />
          </button>
          <button
            onClick={() => setRating(0)}
            className={`p-2 rounded-full transition-colors ${
              rating === 0 ? 'bg-red-100 text-red-600' : 'hover:bg-gray-100'
            }`}
          >
            <ThumbsDown className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowCommentBox(!showCommentBox)}
            className={`p-2 rounded-full transition-colors ${
              showCommentBox ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'
            }`}
          >
            <MessageSquare className="w-5 h-5" />
          </button>
        </div>
        {rating !== null && (
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Submit Feedback
          </button>
        )}
      </div>

      {showCommentBox && (
        <div className="mt-4">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Share your feedback..."
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
          />
        </div>
      )}
    </div>
  );
};