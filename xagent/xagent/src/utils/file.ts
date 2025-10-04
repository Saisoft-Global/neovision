import { ALLOWED_TYPES } from './file/constants';
import type { AllowedMimeType, FileExtension, FileValidationResult } from './file/types';

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

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

export function getFileType(mimeType: string): FileExtension {
  return ALLOWED_TYPES[mimeType as AllowedMimeType] || 'txt';
}

export function getMimeType(extension: string): AllowedMimeType | null {
  const entry = Object.entries(ALLOWED_TYPES).find(([, ext]) => ext === extension);
  return entry ? (entry[0] as AllowedMimeType) : null;
}