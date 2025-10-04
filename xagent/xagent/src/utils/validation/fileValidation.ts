import { z } from 'zod';

// File type definitions
export const ALLOWED_TYPES = {
  'application/pdf': 'pdf',
  'text/plain': 'txt',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.ms-excel': 'xls',
  'image/jpeg': 'jpg',
  'image/png': 'png'
} as const;

// Constants
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Validation schema
export const FileValidationSchema = z.object({
  size: z.number().max(MAX_FILE_SIZE, 'File size exceeds 10MB limit'),
  type: z.enum(Object.keys(ALLOWED_TYPES) as [string, ...string[]], {
    errorMap: () => ({ message: 'Unsupported file type. Supported formats: PDF, Office files, images and text files' })
  })
});

// Validation function
export async function validateFile(file: File): Promise<{ isValid: boolean; error?: string }> {
  try {
    FileValidationSchema.parse({
      size: file.size,
      type: file.type
    });
    return { isValid: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        isValid: false,
        error: error.errors[0].message
      };
    }
    return {
      isValid: false,
      error: 'Invalid file'
    };
  }
}

// Helper function to get file extension
export function getFileType(mimeType: string): string {
  return ALLOWED_TYPES[mimeType as keyof typeof ALLOWED_TYPES] || 'txt';
}