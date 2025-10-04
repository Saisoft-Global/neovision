export function sanitizeContent(content: string): string {
  if (!content) return '';
  
  return content
    .replace(/\0/g, '') // Remove null bytes
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control characters
    .replace(/^\s+|\s+$/g, '') // Trim whitespace
    .replace(/\r\n/g, '\n') // Normalize line endings
    .replace(/\t/g, ' ') // Replace tabs with spaces
    .replace(/\s+/g, ' ') // Normalize spaces
    .replace(/[^\x20-\x7E\n]/g, '') // Remove non-printable characters
    .trim();
}