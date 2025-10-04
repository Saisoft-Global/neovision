export class ExcelValidator {
  validate(file: File): { isValid: boolean; error?: string } {
    // Check file type
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];

    if (!validTypes.includes(file.type)) {
      return {
        isValid: false,
        error: 'Invalid Excel file format. Please use .xlsx or .xls files.'
      };
    }

    // Check file extension
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!['xlsx', 'xls'].includes(extension || '')) {
      return {
        isValid: false,
        error: 'Invalid file extension. Please use .xlsx or .xls files.'
      };
    }

    return { isValid: true };
  }
}