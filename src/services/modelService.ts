import { api } from './api';

export interface TrainingAnnotation {
  labels: {
    text: string;
    bbox: number[];
    label_id: number;
  }[];
}

export interface TrainingRequest {
  files: File[];
  annotations: TrainingAnnotation[];
  modelName: string;
  documentType: string;
}

export const trainModel = async (request: TrainingRequest) => {
  const formData = new FormData();
  
  // Add files
  request.files.forEach((file) => {
    formData.append(`files`, file);
  });
  
  // Add other data
  formData.append('annotations', JSON.stringify(request.annotations));
  formData.append('model_name', request.modelName);
  formData.append('document_type', request.documentType);
  
  const response = await api.post('/train', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  
  return response.data;
};

export const listModels = async () => {
  const response = await api.get('/models');
  return response.data;
};