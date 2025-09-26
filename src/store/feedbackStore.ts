import { create } from 'zustand';

export interface FieldFeedback {
  fieldId: string;
  isCorrect: boolean;
  correction?: string;
  timestamp: string;
}

interface FeedbackStore {
  feedback: { [key: string]: FieldFeedback[] };
  addFeedback: (documentId: string, feedback: FieldFeedback) => void;
  getFeedback: (documentId: string) => FieldFeedback[];
}

export const useFeedbackStore = create<FeedbackStore>((set, get) => ({
  feedback: {},
  
  addFeedback: (documentId, feedback) => set((state) => ({
    feedback: {
      ...state.feedback,
      [documentId]: [
        ...(state.feedback[documentId] || []),
        { ...feedback, timestamp: new Date().toISOString() }
      ]
    }
  })),
  
  getFeedback: (documentId) => get().feedback[documentId] || []
}));