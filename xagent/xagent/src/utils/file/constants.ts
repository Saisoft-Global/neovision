import type { AllowedMimeType, FileExtension } from './types';

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const ALLOWED_TYPES: Record<AllowedMimeType, FileExtension> = {
  'application/pdf': 'pdf',
  'text/plain': 'txt',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.ms-excel': 'xls',
  'image/jpeg': 'jpg',
  'image/png': 'png',
} as const;

export const ALLOWED_EXTENSIONS = Object.values(ALLOWED_TYPES);