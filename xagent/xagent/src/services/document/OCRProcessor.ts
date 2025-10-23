import type { Document } from '../../types/document';
import { createWorker } from 'tesseract.js';

/**
 * OCR Engine Types
 * Configurable via VITE_OCR_ENGINE environment variable
 */
export type OCREngine = 
  | 'tesseract'      // Local, free, good for simple docs
  | 'paddle'         // PaddleOCR, good for multi-language
  | 'aws_textract'   // AWS Textract, best for forms
  | 'azure_form'     // Azure Form Recognizer
  | 'google_vision'  // Google Cloud Vision
  | 'custom';        // Custom IDP solution

/**
 * OCR Configuration
 */
interface OCRConfig {
  engine: OCREngine;
  // Tesseract config
  tesseractLanguage?: string;
  // AWS Textract config
  awsRegion?: string;
  awsAccessKey?: string;
  awsSecretKey?: string;
  // Azure config
  azureEndpoint?: string;
  azureKey?: string;
  // Google Vision config
  googleApiKey?: string;
  // Custom IDP config
  customEndpoint?: string;
  customApiKey?: string;
  customHeaders?: Record<string, string>;
}

/**
 * Extracted Data Structure (for structured document extraction)
 */
export interface ExtractedData {
  text: string;
  confidence?: number;
  fields?: Record<string, any>;
  metadata?: Record<string, any>;
  // ENHANCED: Multimodal data
  imageAnalysis?: ImageAnalysisData;
  audioTranscription?: AudioTranscriptionData;
  documentStructure?: DocumentStructureData;
}

/**
 * ENHANCED: Image Analysis Data
 */
export interface ImageAnalysisData {
  objects?: Array<{
    label: string;
    confidence: number;
    boundingBox: { x: number; y: number; width: number; height: number };
  }>;
  faces?: Array<{
    confidence: number;
    emotions?: string[];
    landmarks?: any[];
  }>;
  colors?: string[];
  sceneDescription?: string;
}

/**
 * ENHANCED: Audio Transcription Data
 */
export interface AudioTranscriptionData {
  transcript: string;
  confidence: number;
  language?: string;
  speakers?: Array<{
    speakerId: string;
    segments: Array<{ start: number; end: number; text: string }>;
  }>;
  emotions?: Array<{ emotion: string; confidence: number; timestamp: number }>;
}

/**
 * ENHANCED: Document Structure Data
 */
export interface DocumentStructureData {
  layout?: Array<{
    type: 'text' | 'image' | 'table' | 'header' | 'footer';
    content: string;
    position: { x: number; y: number; width: number; height: number };
    confidence: number;
  }>;
  tables?: Array<{
    data: string[][];
    headers?: string[];
    confidence: number;
  }>;
  keyValuePairs?: Record<string, string>;
}

/**
 * Enhanced OCR Processor with Multiple Engine Support
 * 
 * Supports:
 * - Tesseract.js (local, free)
 * - PaddleOCR (via API)
 * - AWS Textract (cloud, powerful)
 * - Azure Form Recognizer (cloud, forms)
 * - Google Cloud Vision (cloud, general)
 * - Custom IDP solutions (user-provided endpoint)
 */
export class OCRProcessor {
  private static instance: OCRProcessor;
  private worker: Tesseract.Worker | null = null;
  private config: OCRConfig;

  private constructor() {
    // Load configuration from environment variables
    this.config = this.loadConfig();
    console.log(`🔍 OCR Engine: ${this.config.engine}`);
    
    // Initialize based on engine
    if (this.config.engine === 'tesseract') {
    this.initializeWorker();
    }
  }

  public static getInstance(): OCRProcessor {
    if (!this.instance) {
      this.instance = new OCRProcessor();
    }
    return this.instance;
  }

  /**
   * Load OCR configuration from environment variables
   */
  private loadConfig(): OCRConfig {
    const engine = (import.meta.env.VITE_OCR_ENGINE || 'tesseract') as OCREngine;
    
    return {
      engine,
      // Tesseract
      tesseractLanguage: import.meta.env.VITE_TESSERACT_LANGUAGE || 'eng',
      // AWS Textract
      awsRegion: import.meta.env.VITE_AWS_REGION,
      awsAccessKey: import.meta.env.VITE_AWS_ACCESS_KEY,
      awsSecretKey: import.meta.env.VITE_AWS_SECRET_KEY,
      // Azure Form Recognizer
      azureEndpoint: import.meta.env.VITE_AZURE_FORM_RECOGNIZER_ENDPOINT,
      azureKey: import.meta.env.VITE_AZURE_FORM_RECOGNIZER_KEY,
      // Google Cloud Vision
      googleApiKey: import.meta.env.VITE_GOOGLE_VISION_API_KEY,
      // Custom IDP
      customEndpoint: import.meta.env.VITE_CUSTOM_OCR_ENDPOINT,
      customApiKey: import.meta.env.VITE_CUSTOM_OCR_API_KEY,
      customHeaders: import.meta.env.VITE_CUSTOM_OCR_HEADERS 
        ? JSON.parse(import.meta.env.VITE_CUSTOM_OCR_HEADERS)
        : undefined
    };
  }

  /**
   * Initialize Tesseract worker
   */
  private async initializeWorker(): Promise<void> {
    if (!this.worker) {
      const language = this.config.tesseractLanguage || 'eng';
      this.worker = await createWorker(language);
      console.log(`✅ Tesseract worker initialized (${language})`);
    }
  }

  /**
   * Main OCR processing method - routes to appropriate engine
   */
  async processImage(document: Document): Promise<string> {
    const result = await this.processImageDetailed(document);
    return result.text;
  }

  /**
   * Process image with detailed results
   */
  async processImageDetailed(document: Document): Promise<ExtractedData> {
    console.log(`🔍 Processing with ${this.config.engine} engine...`);

    try {
      switch (this.config.engine) {
        case 'tesseract':
          return await this.processTesseract(document);
        
        case 'paddle':
          return await this.processPaddle(document);
        
        case 'aws_textract':
          return await this.processAWSTextract(document);
        
        case 'azure_form':
          return await this.processAzureForm(document);
        
        case 'google_vision':
          return await this.processGoogleVision(document);
        
        case 'custom':
          return await this.processCustom(document);
        
        default:
          throw new Error(`Unsupported OCR engine: ${this.config.engine}`);
      }
    } catch (error) {
      console.error(`❌ OCR processing error with ${this.config.engine}:`, error);
      throw error;
    }
  }

  /**
   * Process with Tesseract.js (local)
   */
  private async processTesseract(document: Document): Promise<ExtractedData> {
    if (!this.worker) {
      await this.initializeWorker();
    }

      const result = await this.worker!.recognize(document.content);
    
    return {
      text: result.data.text,
      confidence: result.data.confidence / 100, // Convert to 0-1
      metadata: {
        engine: 'tesseract',
        language: this.config.tesseractLanguage
      }
    };
  }

  /**
   * Process with PaddleOCR (API)
   */
  private async processPaddle(document: Document): Promise<ExtractedData> {
    const endpoint = this.config.customEndpoint || 'http://localhost:8866/predict/ocr_system';
    
    const formData = new FormData();
    formData.append('image', document.content);

    const response = await fetch(endpoint, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error(`PaddleOCR API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    // PaddleOCR returns array of [text, confidence]
    const text = data.results.map((r: any) => r[0]).join('\n');
    const avgConfidence = data.results.reduce((sum: number, r: any) => sum + r[1], 0) / data.results.length;

    return {
      text,
      confidence: avgConfidence,
      metadata: {
        engine: 'paddle',
        raw: data
      }
    };
  }

  /**
   * Process with AWS Textract (cloud)
   */
  private async processAWSTextract(document: Document): Promise<ExtractedData> {
    if (!this.config.awsAccessKey || !this.config.awsSecretKey) {
      throw new Error('AWS credentials not configured. Set VITE_AWS_ACCESS_KEY and VITE_AWS_SECRET_KEY');
    }

    // Note: In production, use AWS SDK
    // For now, provide structure for integration
    console.log('📝 AWS Textract integration point');
    
    // Mock response for development
    return {
      text: 'AWS Textract integration - configure credentials',
      confidence: 0.95,
      fields: {
        // Textract returns key-value pairs
        note: 'Configure AWS SDK for production use'
      },
      metadata: {
        engine: 'aws_textract',
        note: 'Install @aws-sdk/client-textract for production'
      }
    };
  }

  /**
   * Process with Azure Form Recognizer (cloud)
   */
  private async processAzureForm(document: Document): Promise<ExtractedData> {
    if (!this.config.azureEndpoint || !this.config.azureKey) {
      throw new Error('Azure credentials not configured. Set VITE_AZURE_FORM_RECOGNIZER_ENDPOINT and KEY');
    }

    // Mock response for development
    console.log('📝 Azure Form Recognizer integration point');
    
    return {
      text: 'Azure Form Recognizer integration - configure credentials',
      confidence: 0.95,
      fields: {},
      metadata: {
        engine: 'azure_form',
        note: 'Install @azure/ai-form-recognizer for production'
      }
    };
  }

  /**
   * Process with Google Cloud Vision (cloud)
   */
  private async processGoogleVision(document: Document): Promise<ExtractedData> {
    if (!this.config.googleApiKey) {
      throw new Error('Google API key not configured. Set VITE_GOOGLE_VISION_API_KEY');
    }

    const endpoint = `https://vision.googleapis.com/v1/images:annotate?key=${this.config.googleApiKey}`;
    
    // Convert document to base64 if needed
    const base64Image = typeof document.content === 'string' 
      ? document.content 
      : await this.toBase64(document.content);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [{
          image: { content: base64Image },
          features: [{ type: 'DOCUMENT_TEXT_DETECTION' }]
        }]
      })
    });

    if (!response.ok) {
      throw new Error(`Google Vision API error: ${response.statusText}`);
    }

    const data = await response.json();
    const text = data.responses[0]?.fullTextAnnotation?.text || '';
    const confidence = data.responses[0]?.fullTextAnnotation?.pages?.[0]?.confidence || 0.9;

    return {
      text,
      confidence,
      metadata: {
        engine: 'google_vision',
        raw: data
      }
    };
  }

  /**
   * Process with Custom IDP solution
   */
  private async processCustom(document: Document): Promise<ExtractedData> {
    if (!this.config.customEndpoint) {
      throw new Error('Custom OCR endpoint not configured. Set VITE_CUSTOM_OCR_ENDPOINT');
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(this.config.customHeaders || {})
    };

    if (this.config.customApiKey) {
      headers['Authorization'] = `Bearer ${this.config.customApiKey}`;
    }

    const response = await fetch(this.config.customEndpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        image: document.content,
        options: {
          // Allow custom options
          ...document.metadata
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Custom OCR API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Adapt response format (customize based on your IDP solution)
    return {
      text: data.text || data.extractedText || '',
      confidence: data.confidence || 0.85,
      fields: data.fields || data.data || {},
      metadata: {
        engine: 'custom',
        raw: data
      }
    };
  }

  /**
   * Get current OCR engine
   */
  getEngine(): OCREngine {
    return this.config.engine;
  }

  /**
   * Get engine capabilities
   */
  getCapabilities(): {
    engine: OCREngine;
    supportsStructuredData: boolean;
    supportsMultiLanguage: boolean;
    isLocal: boolean;
    requiresAPIKey: boolean;
  } {
    const capabilities = {
      tesseract: {
        supportsStructuredData: false,
        supportsMultiLanguage: true,
        isLocal: true,
        requiresAPIKey: false
      },
      paddle: {
        supportsStructuredData: true,
        supportsMultiLanguage: true,
        isLocal: false,
        requiresAPIKey: false
      },
      aws_textract: {
        supportsStructuredData: true,
        supportsMultiLanguage: true,
        isLocal: false,
        requiresAPIKey: true
      },
      azure_form: {
        supportsStructuredData: true,
        supportsMultiLanguage: true,
        isLocal: false,
        requiresAPIKey: true
      },
      google_vision: {
        supportsStructuredData: true,
        supportsMultiLanguage: true,
        isLocal: false,
        requiresAPIKey: true
      },
      custom: {
        supportsStructuredData: true,
        supportsMultiLanguage: true,
        isLocal: false,
        requiresAPIKey: true
      }
    };

    return {
      engine: this.config.engine,
      ...capabilities[this.config.engine]
    };
  }

  /**
   * Helper: Convert to base64
   */
  private async toBase64(content: any): Promise<string> {
    if (typeof content === 'string') return content;
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(content);
    });
  }

  /**
   * ENHANCED: Process multimodal content (image, audio, document)
   */
  async processMultimodalContent(
    content: {
      type: 'image' | 'audio' | 'document' | 'video';
      file: File | Blob;
      metadata?: Record<string, any>;
    }
  ): Promise<ExtractedData> {
    try {
      console.log(`🎭 Processing ${content.type} content...`);
      
      switch (content.type) {
        case 'image':
          return await this.processImageContent(content.file, content.metadata);
        case 'audio':
          return await this.processAudioContent(content.file, content.metadata);
        case 'document':
          return await this.processDocumentContent(content.file, content.metadata);
        case 'video':
          return await this.processVideoContent(content.file, content.metadata);
        default:
          throw new Error(`Unsupported content type: ${content.type}`);
      }
    } catch (error) {
      console.error('Multimodal processing error:', error);
      throw error;
    }
  }

  /**
   * ENHANCED: Process image content with advanced analysis
   */
  private async processImageContent(
    file: File | Blob,
    metadata?: Record<string, any>
  ): Promise<ExtractedData> {
    try {
      // 1. OCR text extraction
      const ocrResult = await this.processImageDetailed({
        id: crypto.randomUUID(),
        name: file instanceof File ? file.name : 'image',
        content: '',
        type: 'image',
        size: file.size,
        uploadedAt: new Date().toISOString()
      } as Document);

      // 2. Image analysis (objects, faces, colors)
      const imageAnalysis = await this.analyzeImageContent(file);

      return {
        text: ocrResult.text,
        confidence: ocrResult.confidence,
        fields: ocrResult.fields,
        metadata: {
          ...ocrResult.metadata,
          ...metadata,
          processingType: 'multimodal_image'
        },
        imageAnalysis
      };
    } catch (error) {
      console.error('Image content processing error:', error);
      throw error;
    }
  }

  /**
   * ENHANCED: Process audio content with transcription
   */
  private async processAudioContent(
    file: File | Blob,
    metadata?: Record<string, any>
  ): Promise<ExtractedData> {
    try {
      // 1. Audio transcription
      const transcription = await this.transcribeAudio(file);

      return {
        text: transcription.transcript,
        confidence: transcription.confidence,
        metadata: {
          ...metadata,
          processingType: 'multimodal_audio',
          duration: metadata?.duration || 0
        },
        audioTranscription: {
          transcript: transcription.transcript,
          confidence: transcription.confidence,
          language: transcription.language
        }
      };
    } catch (error) {
      console.error('Audio content processing error:', error);
      throw error;
    }
  }

  /**
   * ENHANCED: Process document content with structure analysis
   */
  private async processDocumentContent(
    file: File | Blob,
    metadata?: Record<string, any>
  ): Promise<ExtractedData> {
    try {
      // 1. OCR text extraction
      const ocrResult = await this.processImageDetailed({
        id: crypto.randomUUID(),
        name: file instanceof File ? file.name : 'document',
        content: '',
        type: 'document',
        size: file.size,
        uploadedAt: new Date().toISOString()
      } as Document);

      // 2. Key-value pair extraction
      const keyValuePairs = await this.extractKeyValuePairs(ocrResult.text);

      return {
        text: ocrResult.text,
        confidence: ocrResult.confidence,
        fields: { ...ocrResult.fields, ...keyValuePairs },
        metadata: {
          ...ocrResult.metadata,
          ...metadata,
          processingType: 'multimodal_document'
        },
        documentStructure: {
          keyValuePairs
        }
      };
    } catch (error) {
      console.error('Document content processing error:', error);
      throw error;
    }
  }

  /**
   * ENHANCED: Process video content (placeholder)
   */
  private async processVideoContent(
    file: File | Blob,
    metadata?: Record<string, any>
  ): Promise<ExtractedData> {
    // Placeholder for video processing
    return {
      text: `Video processing not yet implemented for ${file instanceof File ? file.name : 'video file'}`,
      confidence: 0.5,
      metadata: {
        ...metadata,
        processingType: 'multimodal_video',
        status: 'not_implemented'
      }
    };
  }

  /**
   * ENHANCED: Analyze image content (placeholder)
   */
  private async analyzeImageContent(file: File | Blob): Promise<ImageAnalysisData> {
    // Placeholder implementation
    return {
      sceneDescription: 'Image analysis placeholder'
    };
  }

  /**
   * ENHANCED: Transcribe audio content (placeholder)
   */
  private async transcribeAudio(file: File | Blob): Promise<{ transcript: string; confidence: number; language?: string }> {
    // Placeholder implementation
    return {
      transcript: `Audio transcription placeholder for ${file instanceof File ? file.name : 'audio file'}`,
      confidence: 0.5,
      language: 'en'
    };
  }

  /**
   * ENHANCED: Extract key-value pairs from text
   */
  private async extractKeyValuePairs(text: string): Promise<Record<string, string>> {
    try {
      const pairs: Record<string, string> = {};
      const patterns = [
        /([A-Za-z\s]+):\s*([^\n]+)/g,
        /([A-Za-z\s]+)\s*=\s*([^\n]+)/g
      ];

      for (const pattern of patterns) {
        let match;
        while ((match = pattern.exec(text)) !== null) {
          const key = match[1].trim();
          const value = match[2].trim();
          if (key && value && key.length < 50 && value.length < 200) {
            pairs[key] = value;
          }
        }
      }

      return pairs;
    } catch (error) {
      console.error('Key-value extraction error:', error);
      return {};
    }
  }

  /**
   * Terminate/cleanup
   */
  async terminate(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
      console.log('✅ Tesseract worker terminated');
    }
  }
}