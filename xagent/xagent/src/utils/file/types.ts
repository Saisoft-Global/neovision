import { z } from 'zod';

export type AllowedMimeType = 
  | 'application/pdf'
  | 'text/plain'
  | 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  | 'application/msword'
  | 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  | 'application/vnd.ms-excel'
  | 'image/jpeg'
  | 'image/png';

export type FileExtension = 'pdf' | 'txt' | 'docx' | 'doc' | 'xlsx' | 'xls' | 'jpg' | 'png';

export interface FileValidationResult {
  isValid: boolean;
  error?: string;
}