import * as XLSX from 'sheetjs-style';

export async function extractExcelText(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    
    // Read workbook
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    
    let fullText = '';
    
    // Extract text from all sheets
    workbook.SheetNames.forEach(sheetName => {
      const worksheet = workbook.Sheets[sheetName];
      
      // Convert sheet to JSON to extract text
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      // Combine all text content
      const sheetText = jsonData
        .map((row: any) => {
          if (Array.isArray(row)) {
            return row.filter(cell => cell && typeof cell === 'string').join(' ');
          }
          return '';
        })
        .filter(text => text.trim())
        .join('\n');
      
      if (sheetText.trim()) {
        fullText += `Sheet: ${sheetName}\n${sheetText}\n\n`;
      }
    });
    
    return fullText.trim() || `No text extracted from Excel: ${file.name}`;
  } catch (error) {
    console.error('Excel extraction error:', error);
    // Fallback: return basic info about the file
    return `Excel file: ${file.name} (${(file.size / 1024).toFixed(2)} KB) - Extraction failed`;
  }
}