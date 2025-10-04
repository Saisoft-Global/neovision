export class URLValidator {
  validate(url: string): { isValid: boolean; error?: string } {
    try {
      const urlObj = new URL(url);
      
      // Check protocol
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        return {
          isValid: false,
          error: 'Only HTTP and HTTPS URLs are supported'
        };
      }

      // Check for common file extensions that might not contain readable content
      const fileExtension = urlObj.pathname.split('.').pop()?.toLowerCase();
      const invalidExtensions = ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'mp4', 'mp3'];
      if (fileExtension && invalidExtensions.includes(fileExtension)) {
        return {
          isValid: false,
          error: 'Direct file URLs are not supported. Please provide a webpage URL.'
        };
      }

      return { isValid: true };
    } catch {
      return {
        isValid: false,
        error: 'Invalid URL format'
      };
    }
  }
}