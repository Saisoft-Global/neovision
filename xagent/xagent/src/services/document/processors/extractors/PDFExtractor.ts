export async function extractPDFText(file: File): Promise<string> {
  // Using PDF.js or similar library
  const arrayBuffer = await file.arrayBuffer();
  // Implementation would use PDF.js to extract text
  // For now, return placeholder
  return `Extracted text from PDF: ${file.name}`;
}