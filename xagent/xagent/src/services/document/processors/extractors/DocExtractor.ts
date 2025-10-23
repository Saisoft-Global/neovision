import mammoth from 'mammoth';

export async function extractDocText(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    
    // Extract text using mammoth.js
    const result = await mammoth.extractRawText({ arrayBuffer });
    
    if (result.messages && result.messages.length > 0) {
      console.warn('DOC extraction warnings:', result.messages);
    }
    
    return result.value.trim() || `No text extracted from DOC: ${file.name}`;
  } catch (error) {
    console.error('DOC extraction error:', error);
    // Fallback: return basic info about the file
    return `DOC file: ${file.name} (${(file.size / 1024).toFixed(2)} KB) - Extraction failed`;
  }
}