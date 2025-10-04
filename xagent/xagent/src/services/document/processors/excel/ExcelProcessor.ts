import { loadXLSX } from '../../../../utils/imports';
import { sanitizeContent } from '../../utils/sanitization';

export class ExcelProcessor {
  async processFile(file: File): Promise<string> {
    try {
      const XLSX = await loadXLSX();
      const buffer = await file.arrayBuffer();
      
      // Parse workbook with strict error checking
      const workbook = XLSX.read(buffer, { 
        type: 'array',
        cellDates: true,
        cellNF: false,
        cellText: false,
        WTF: true // Enable strict parsing
      });
      
      if (!workbook || !workbook.SheetNames?.length) {
        throw new Error('Invalid Excel file structure');
      }

      const sheets = workbook.SheetNames.map(name => {
        const sheet = workbook.Sheets[name];
        if (!sheet) {
          throw new Error(`Sheet "${name}" is empty or corrupted`);
        }

        // Convert sheet to JSON with proper options
        const data = XLSX.utils.sheet_to_json(sheet, { 
          header: 1,
          raw: false,
          dateNF: 'YYYY-MM-DD',
          defval: '',
          blankrows: false
        });

        return this.formatSheetData(name, data);
      });

      const content = sheets.join('\n\n');
      if (!content.trim()) {
        throw new Error('No content could be extracted from Excel file');
      }

      return sanitizeContent(content);
    } catch (error) {
      console.error('Excel processing error:', error);
      throw new Error(
        error instanceof Error 
          ? `Failed to process Excel file: ${error.message}`
          : 'Failed to process Excel file'
      );
    }
  }

  private formatSheetData(name: string, data: any[][]): string {
    // Filter out empty rows and format cells
    const rows = data
      .filter(row => row.some(cell => cell !== ''))
      .map(row => row.map(cell => {
        if (cell === null || cell === undefined) return '';
        
        // Format dates
        if (cell instanceof Date) {
          return cell.toISOString().split('T')[0];
        }
        
        // Handle numbers
        if (typeof cell === 'number') {
          return cell.toString();
        }
        
        // Clean and sanitize text
        return sanitizeContent(String(cell));
      }).join('\t'));

    if (!rows.length) {
      return `Sheet: ${name}\n(Empty sheet)`;
    }

    return `Sheet: ${name}\n${rows.join('\n')}`;
  }
}