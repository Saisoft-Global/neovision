export async function extractDocText(file: File): Promise<string> {
  // Using mammoth.js or similar library
  const arrayBuffer = await file.arrayBuffer();
  // Implementation would use appropriate library to extract text
  // For now, return placeholder
  return `Extracted text from DOC: ${file.name}`;
}