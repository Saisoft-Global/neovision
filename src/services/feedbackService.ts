import { api } from './api/config';
import type { FieldFeedback } from '../store/feedbackStore';

export const submitFeedback = async (documentId: string, feedback: FieldFeedback[]) => {
  const response = await api.post(`/feedback/${documentId}`, { feedback });
  return response.data;
};

export const getFieldStatistics = async (fieldId: string) => {
  const response = await api.get(`/feedback/stats/${fieldId}`);
  return response.data;
};