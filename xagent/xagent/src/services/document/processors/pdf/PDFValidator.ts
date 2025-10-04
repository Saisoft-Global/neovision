export class PDFValidator {
  validate(file: File): { isValid: boolean; error?: string } {
    // Check file type
    if (file.type !== 'application/pdf') {
      return {
        isValid: false,
        error: 'Invalid file type. Please upload a PDF file.'
      };
    }

    // Check file extension
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (extension !== 'pdf') {
      return {
        isValid: false,
        error: 'Invalid file extension. Please use .pdf files.'
      };
    }

    return { isValid: true };
  }
}