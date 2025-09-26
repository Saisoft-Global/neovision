import { api } from './api';
interface FieldCorrection {
  fieldId: string;
  originalValue: string;
  correctedValue: string;
  confidence: number;
  documentType: string;
  documentId: string;
}

interface FieldStats {
  accuracy: number;
  total_corrections: number;
  common_corrections: Record<string, number>;
}

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

export const getFieldStatistics = async (fieldId: string): Promise<FieldStats> => {
  const response = await api.get(`/field-stats/${fieldId}`);
  return response.data;
};