import { loadTesseract } from '../../../../utils/imports';
import { sanitizeContent } from '../../utils/sanitization';
import { createChatCompletion } from '../../../openai/chat';

export class ImageProcessor {
  private static tesseractWorker: any = null;
  private static initPromise: Promise<void> | null = null;

  async processFile(file: File): Promise<string> {
    try {
      // Initialize Tesseract if needed
      if (!ImageProcessor.tesseractWorker) {
        if (!ImageProcessor.initPromise) {
          ImageProcessor.initPromise = this.initializeTesseract();
        }
        await ImageProcessor.initPromise;
      }

      // Convert File to image data URL
      const imageUrl = await this.fileToDataUrl(file);
      
      // Perform OCR
      const { data: { text } } = await ImageProcessor.tesseractWorker.recognize(imageUrl);

      // Use OpenAI to clean and structure the extracted text
      const enhancedText = await this.enhanceExtractedText(text);

      return sanitizeContent(enhancedText);
    } catch (error) {
      console.error('Image processing error:', error);
      throw new Error(
        error instanceof Error 
          ? `Failed to process image: ${error.message}`
          : 'Failed to process image'
      );
    }
  }

  private async initializeTesseract(): Promise<void> {
    try {
      const tesseract = await loadTesseract();
      ImageProcessor.tesseractWorker = await tesseract.createWorker({
        logger: m => console.debug('Tesseract:', m),
        errorHandler: err => console.error('Tesseract error:', err)
      });

      // Load English language data
      await ImageProcessor.tesseractWorker.loadLanguage('eng');
      await ImageProcessor.tesseractWorker.initialize('eng');
      await ImageProcessor.tesseractWorker.setParameters({
        tessedit_pageseg_mode: '1',
        preserve_interword_spaces: '1',
      });

      ImageProcessor.initPromise = null;
    } catch (error) {
      ImageProcessor.tesseractWorker = null;
      ImageProcessor.initPromise = null;
      throw error;
    }
  }

  private async fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  private async enhanceExtractedText(text: string): Promise<string> {
    if (!text.trim()) {
      throw new Error('No text could be extracted from image');
    }

    const response = await createChatCompletion([
      {
        role: 'system',
        content: 'Clean and structure the following OCR-extracted text. Fix obvious OCR errors, organize paragraphs, and maintain proper formatting.',
      },
      { role: 'user', content: text },
    ]);

    return response?.choices[0]?.message?.content || text;
  }

  async cleanup(): Promise<void> {
    if (ImageProcessor.tesseractWorker) {
      await ImageProcessor.tesseractWorker.terminate();
      ImageProcessor.tesseractWorker = null;
    }
  }
}