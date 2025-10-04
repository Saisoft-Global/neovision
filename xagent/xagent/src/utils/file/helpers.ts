import { ALLOWED_TYPES } from './constants';
import type { AllowedMimeType, FileExtension } from './types';

export function getFileType(mimeType: string): FileExtension {
  return ALLOWED_TYPES[mimeType as AllowedMimeType] || 'txt';
}

export function getMimeType(extension: string): AllowedMimeType | null {
  const entry = Object.entries(ALLOWED_TYPES).find(([, ext]) => ext === extension);
  return entry ? (entry[0] as AllowedMimeType) : null;
}