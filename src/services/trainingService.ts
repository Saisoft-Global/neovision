import { api } from './api/config';

export interface TrainedModel {
  model_name: string;
  path: string;
  metadata: {
    model_name: string;
    timestamp: string;
    num_documents: number;
    label_map: Record<string, number>;
  };
}

export interface ModelsResponse {
  status: string;
  models: TrainedModel[];
  count: number;
}

export interface TrainingStatus {
  status: string;
  progress: number;
  message: string;
  model_name?: string;
}

export interface ActiveModelInfo {
  status: string;
  active: boolean;
  model_name?: string;
  model_path?: string;
  device?: string;
  loaded?: boolean;
  message?: string;
}

export const trainingService = {
  // Get all trained models
  async getModels(): Promise<TrainedModel[]> {
    try {
      const response = await api.get<ModelsResponse>('/training/models');
      return response.data.models || [];
    } catch (error) {
      console.error('Error fetching models:', error);
      throw new Error('Failed to fetch trained models');
    }
  },

  // Get training status for a specific model
  async getTrainingStatus(modelName: string): Promise<TrainingStatus> {
    try {
      const response = await api.get<TrainingStatus>(`/training/training-status/${modelName}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching training status:', error);
      throw new Error('Failed to fetch training status');
    }
  },

  // Get active model information
  async getActiveModel(): Promise<ActiveModelInfo> {
    try {
      const response = await api.get<ActiveModelInfo>('/training/active-model');
      return response.data;
    } catch (error) {
      console.error('Error fetching active model:', error);
      throw new Error('Failed to fetch active model');
    }
  },

  // Set active model
  async setActiveModel(modelName: string): Promise<{ status: string; message: string }> {
    try {
      const formData = new FormData();
      formData.append('model_name', modelName);
      
      const response = await api.post<{ status: string; message: string }>('/training/set-active', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error setting active model:', error);
      throw new Error('Failed to set active model');
    }
  },

  // Auto-set latest model as active
  async autoSetLatestModel(): Promise<{ status: string; message: string; model_name?: string }> {
    try {
      const response = await api.post<{ status: string; message: string; model_name?: string }>('/training/auto-set-latest');
      return response.data;
    } catch (error) {
      console.error('Error auto-setting latest model:', error);
      throw new Error('Failed to auto-set latest model');
    }
  },

  // Clear active model
  async clearActiveModel(): Promise<{ status: string; message: string }> {
    try {
      const response = await api.delete<{ status: string; message: string }>('/training/clear-active');
      return response.data;
    } catch (error) {
      console.error('Error clearing active model:', error);
      throw new Error('Failed to clear active model');
    }
  },

  // Train model
  async trainModel(data: {
    files: File[];
    annotations: any[];
    modelName: string;
    documentType: string;
  }): Promise<{
    status: string;
    message: string;
    num_documents?: number;
    total_annotations?: number;
    model_path?: string;
  }> {
    try {
      const formData = new FormData();
      
      // Add files
      data.files.forEach((file) => {
        formData.append('files', file);
      });
      
      // Add annotations
      formData.append('annotations', JSON.stringify(data.annotations));
      formData.append('model_name', data.modelName);
      formData.append('document_type', data.documentType);
      
      const response = await api.post('/training/train', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      return response.data;
    } catch (error) {
      console.error('Error training model:', error);
      throw new Error('Failed to train model');
    }
  }
};

// Export the trainModel function for direct import
export const trainModel = trainingService.trainModel;