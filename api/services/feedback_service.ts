import { api } from './api';
import type { FieldCorrection } from '../store/feedbackStore';

export const submitFeedback = async (correction: FieldCorrection) => {
  const response = await api.post(
    `/feedback/${correction.documentId}/${correction.fieldId}`,
    {
      original_value: correction.originalValue,
      corrected_value: correction.correctedValue,
      confidence: correction.confidence,
      type: 'correction'
    }
  );
  return response.data;
};

export const getFieldStatistics = async (fieldId: string) => {
  const response = await api.get(`/field-stats/${fieldId}`);
  return response.data;
};