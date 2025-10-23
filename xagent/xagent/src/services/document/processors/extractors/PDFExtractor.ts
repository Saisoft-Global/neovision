import * as pdfjsLib from 'pdfjs-dist';

export async function extractPDFText(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    
    // Load PDF document with robust configuration
    const pdf = await pdfjsLib.getDocument({ 
      data: arrayBuffer,
      disableFontFace: true, // Disable font face loading
      verbosity: 0
    }).promise;
    
    let fullText = '';
    
    // Extract text from all pages
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      // Combine text items
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      
      fullText += pageText + '\n';
    }
    
    return fullText.trim() || `No text extracted from PDF: ${file.name}`;
  } catch (error) {
    console.error('PDF extraction error:', error);
    // Fallback: return basic info about the file
    return `PDF file: ${file.name} (${(file.size / 1024).toFixed(2)} KB) - Extraction failed`;
  }
}