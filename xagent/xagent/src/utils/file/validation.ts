import type { FileValidationResult } from './types';
import { MAX_FILE_SIZE, ALLOWED_TYPES } from './constants';

export async function validateFile(file: File): Promise<FileValidationResult> {
  if (file.size > MAX_FILE_SIZE) {
    return { 
      isValid: false, 
      error: 'File size exceeds 10MB limit' 
    };
  }

  if (!Object.keys(ALLOWED_TYPES).includes(file.type)) {
    return { 
      isValid: false, 
      error: 'Unsupported file type. Supported formats: PDF, Office files, images and text files' 
    };
  }

  return { isValid: true };
}