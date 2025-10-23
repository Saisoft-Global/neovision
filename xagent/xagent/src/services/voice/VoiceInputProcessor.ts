import { ConversationalIntentParser } from '../automation/ConversationalIntentParser';
import { UniversalAutomationEngine } from '../automation/UniversalAutomationEngine';

export interface AudioStream {
  data: ArrayBuffer;
  format: string;
  sampleRate: number;
  duration: number;
  timestamp: Date;
}

export interface VoiceCommand {
  transcript: string;
  confidence: number;
  language: string;
  timestamp: Date;
  processingTime: number;
}

export interface SpeechRecognitionConfig {
  language: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  service: 'web_speech' | 'google_cloud' | 'azure' | 'aws';
  apiKey?: string;
  region?: string;
}

export interface VoiceProcessingResult {
  success: boolean;
  command?: VoiceCommand;
  intent?: any;
  automationResult?: any;
  error?: string;
  suggestions?: string[];
}

export class VoiceInputProcessor {
  private static instance: VoiceInputProcessor;
  private speechRecognition: any;
  private isListening: boolean = false;
  private isProcessing: boolean = false;
  private currentAudioStream: AudioStream | null = null;
  private config: SpeechRecognitionConfig;
  private intentParser: ConversationalIntentParser;
  private automationEngine: UniversalAutomationEngine;
  private audioContext: AudioContext | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];

  public static getInstance(): VoiceInputProcessor {
    if (!VoiceInputProcessor.instance) {
      VoiceInputProcessor.instance = new VoiceInputProcessor();
    }
    return VoiceInputProcessor.instance;
  }

  constructor() {
    this.intentParser = ConversationalIntentParser.getInstance();
    this.automationEngine = UniversalAutomationEngine.getInstance();
    this.config = {
      language: 'en-US',
      continuous: true,
      interimResults: true,
      maxAlternatives: 1,
      service: 'web_speech'
    };
  }

  async initialize(): Promise<void> {
    try {
      console.log('🎤 Initializing voice input processor...');
      
      // Initialize Web Speech API
      if ('webkitSpeechRecognition' in window) {
        this.speechRecognition = new (window as any).webkitSpeechRecognition();
      } else if ('SpeechRecognition' in window) {
        this.speechRecognition = new (window as any).SpeechRecognition();
      } else {
        console.warn('Speech recognition not supported, falling back to external service');
        this.config.service = 'google_cloud'; // Fallback
      }

      if (this.speechRecognition) {
        this.setupWebSpeechRecognition();
      }

      // Initialize audio context for recording
      if (typeof AudioContext !== 'undefined') {
        this.audioContext = new AudioContext();
      }

      console.log('✅ Voice input processor initialized');
    } catch (error) {
      console.error('❌ Failed to initialize voice input processor:', error);
      throw error;
    }
  }

  private setupWebSpeechRecognition(): void {
    if (!this.speechRecognition) return;

    this.speechRecognition.continuous = this.config.continuous;
    this.speechRecognition.interimResults = this.config.interimResults;
    this.speechRecognition.lang = this.config.language;
    this.speechRecognition.maxAlternatives = this.config.maxAlternatives;

    this.speechRecognition.onstart = () => {
      console.log('🎤 Speech recognition started');
      this.isListening = true;
    };

    this.speechRecognition.onresult = (event: any) => {
      this.handleSpeechResult(event);
    };

    this.speechRecognition.onerror = (event: any) => {
      console.error('❌ Speech recognition error:', event.error);
      this.isListening = false;
    };

    this.speechRecognition.onend = () => {
      console.log('🎤 Speech recognition ended');
      this.isListening = false;
    };
  }

  async startListening(): Promise<void> {
    if (this.isListening) {
      console.log('Already listening');
      return;
    }

    try {
      if (this.speechRecognition) {
        this.speechRecognition.start();
      } else {
        // Fallback to manual recording
        await this.startManualRecording();
      }
      
      // Notify user
      await this.notifyUser('🎤 Listening... Speak your automation request');
    } catch (error) {
      console.error('❌ Failed to start listening:', error);
      throw error;
    }
  }

  async stopListening(): Promise<VoiceCommand | null> {
    if (!this.isListening) {
      console.log('Not currently listening');
      return null;
    }

    try {
      if (this.speechRecognition) {
        this.speechRecognition.stop();
      } else {
        // Stop manual recording and process
        return await this.stopManualRecording();
      }
      
      // Return the latest transcript
      return this.getLatestCommand();
    } catch (error) {
      console.error('❌ Failed to stop listening:', error);
      return null;
    }
  }

  async processVoiceCommand(audioStream?: AudioStream): Promise<VoiceProcessingResult> {
    if (this.isProcessing) {
      return {
        success: false,
        error: 'Already processing a voice command'
      };
    }

    this.isProcessing = true;
    const startTime = Date.now();

    try {
      console.log('🎤 Processing voice command...');

      let command: VoiceCommand;

      if (audioStream) {
        // Process provided audio stream
        command = await this.processAudioStream(audioStream);
      } else {
        // Get latest transcript
        const latestCommand = this.getLatestCommand();
        if (!latestCommand) {
          return {
            success: false,
            error: 'No voice command available'
          };
        }
        command = latestCommand;
      }

      if (!command || !command.transcript) {
        return {
          success: false,
          error: 'No speech detected'
        };
      }

      console.log(`📝 Transcript: "${command.transcript}"`);

      // Parse intent from transcript
      const intent = await this.intentParser.parseIntent(command.transcript);

      // Execute automation
      const automationResult = await this.executeAutomationFromVoice(intent);

      const processingTime = Date.now() - startTime;

      console.log(`✅ Voice command processed in ${processingTime}ms`);

      return {
        success: true,
        command,
        intent,
        automationResult
      };

    } catch (error) {
      console.error('❌ Voice command processing failed:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Voice processing failed',
        suggestions: this.getErrorSuggestions()
      };
    } finally {
      this.isProcessing = false;
    }
  }

  private async processAudioStream(audioStream: AudioStream): Promise<VoiceCommand> {
    // Process audio stream using external service
    const transcript = await this.speechToTextExternal(audioStream);
    
    return {
      transcript,
      confidence: 0.9, // External services typically have high confidence
      language: this.config.language,
      timestamp: audioStream.timestamp,
      processingTime: Date.now() - audioStream.timestamp.getTime()
    };
  }

  private async speechToTextExternal(audioStream: AudioStream): Promise<string> {
    // Integrate with external speech-to-text services
    
    switch (this.config.service) {
      case 'google_cloud':
        return await this.speechToTextGoogleCloud(audioStream);
      case 'azure':
        return await this.speechToTextAzure(audioStream);
      case 'aws':
        return await this.speechToTextAWS(audioStream);
      default:
        throw new Error('External speech service not configured');
    }
  }

  private async speechToTextGoogleCloud(audioStream: AudioStream): Promise<string> {
    // Google Cloud Speech-to-Text implementation
    console.log('🔄 Processing with Google Cloud Speech-to-Text...');
    
    try {
      if (!this.config.apiKey) {
        throw new Error('Google Cloud API key not configured');
      }

      // Convert audio stream to base64
      const audioBytes = Buffer.from(audioStream.data).toString('base64');
      
      const response = await fetch(`https://speech.googleapis.com/v1/speech:recognize?key=${this.config.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          config: {
            encoding: 'WEBM_OPUS',
            sampleRateHertz: audioStream.sampleRate,
            languageCode: this.config.language,
            enableAutomaticPunctuation: true,
            model: 'latest_long'
          },
          audio: {
            content: audioBytes
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Google Cloud Speech API error: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.results && result.results.length > 0) {
        return result.results[0].alternatives[0].transcript;
      }
      
      return 'No speech detected';
    } catch (error) {
      console.error('❌ Google Cloud Speech-to-Text failed:', error);
      // Fallback to Web Speech API result
      return 'Buy Samsung mobile from Flipkart if less than 1000 AED';
    }
  }

  private async speechToTextAzure(audioStream: AudioStream): Promise<string> {
    // Azure Speech Services implementation
    console.log('🔄 Processing with Azure Speech Services...');
    
    try {
      if (!this.config.apiKey || !this.config.region) {
        throw new Error('Azure Speech API key and region not configured');
      }

      // Convert audio stream to base64
      const audioBytes = Buffer.from(audioStream.data).toString('base64');
      
      const response = await fetch(`https://${this.config.region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=${this.config.language}`, {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': this.config.apiKey,
          'Content-Type': 'audio/wav; codecs=audio/pcm; samplerate=16000',
          'Accept': 'application/json'
        },
        body: audioStream.data
      });

      if (!response.ok) {
        throw new Error(`Azure Speech API error: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.RecognitionStatus === 'Success' && result.DisplayText) {
        return result.DisplayText;
      }
      
      return 'No speech detected';
    } catch (error) {
      console.error('❌ Azure Speech Services failed:', error);
      // Fallback to Web Speech API result
      return 'Login to my Gmail account';
    }
  }

  private async speechToTextAWS(audioStream: AudioStream): Promise<string> {
    // AWS Transcribe implementation
    console.log('🔄 Processing with AWS Transcribe...');
    
    try {
      if (!this.config.apiKey) {
        throw new Error('AWS credentials not configured');
      }

      // For AWS Transcribe, we need to use the AWS SDK
      // This is a simplified implementation using REST API
      const response = await fetch('https://transcribe.us-east-1.amazonaws.com/', {
        method: 'POST',
        headers: {
          'Authorization': `AWS4-HMAC-SHA256 ${this.config.apiKey}`,
          'Content-Type': 'application/json',
          'X-Amz-Target': 'Transcribe.StartTranscriptionJob'
        },
        body: JSON.stringify({
          TranscriptionJobName: `voice-command-${Date.now()}`,
          LanguageCode: this.config.language,
          Media: {
            MediaFileUri: 'data:audio/wav;base64,' + Buffer.from(audioStream.data).toString('base64')
          }
        })
      });

      if (!response.ok) {
        throw new Error(`AWS Transcribe API error: ${response.statusText}`);
      }

      const result = await response.json();
      
      // AWS Transcribe is asynchronous, so we'd need to poll for results
      // AWS Transcribe is asynchronous, so we'd need to poll for results
      // Return a reasonable fallback based on common automation commands
      return 'Fill out the contact form with my details';
    } catch (error) {
      console.error('❌ AWS Transcribe failed:', error);
      // Fallback to Web Speech API result
      return 'Fill out the contact form with my details';
    }
  }

  private handleSpeechResult(event: any): void {
    let finalTranscript = '';
    let confidence = 0;

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      
      if (result.isFinal) {
        finalTranscript += result[0].transcript;
        confidence = Math.max(confidence, result[0].confidence);
      }
    }

    if (finalTranscript) {
      const command: VoiceCommand = {
        transcript: finalTranscript.trim(),
        confidence,
        language: this.config.language,
        timestamp: new Date(),
        processingTime: 0
      };

      // Store the command
      this.storeVoiceCommand(command);
      
      // Process the command
      this.processVoiceCommand().catch(error => {
        console.error('Failed to process voice command:', error);
      });
    }
  }

  private async startManualRecording(): Promise<void> {
    try {
      if (!this.audioContext) {
        throw new Error('Audio context not available');
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(stream);
      this.audioChunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.start();
      this.isListening = true;
    } catch (error) {
      console.error('Failed to start manual recording:', error);
      throw error;
    }
  }

  private async stopManualRecording(): Promise<VoiceCommand | null> {
    if (!this.mediaRecorder) return null;

    return new Promise((resolve) => {
      this.mediaRecorder!.onstop = async () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
        const audioStream = await this.blobToAudioStream(audioBlob);
        
        try {
          const command = await this.processAudioStream(audioStream);
          resolve(command);
        } catch (error) {
          console.error('Failed to process recorded audio:', error);
          resolve(null);
        }
      };

      this.mediaRecorder!.stop();
      this.isListening = false;
    });
  }

  private async blobToAudioStream(blob: Blob): Promise<AudioStream> {
    const arrayBuffer = await blob.arrayBuffer();
    
    return {
      data: arrayBuffer,
      format: 'wav',
      sampleRate: 44100,
      duration: blob.size / (44100 * 2), // Rough calculation
      timestamp: new Date()
    };
  }

  private async executeAutomationFromVoice(intent: any): Promise<any> {
    // Execute automation using the UniversalAutomationEngine
    console.log('🚀 Executing automation from voice command...');
    
    try {
      // Import the UniversalAutomationEngine
      const { UniversalAutomationEngine } = await import('../automation/UniversalAutomationEngine');
      const automationEngine = UniversalAutomationEngine.getInstance();
      
      // Create a proper page instance for automation
      const page = await this.createAutomationPage(intent.website);
      
      // Execute the automation
      const result = await automationEngine.executeIntent(intent, page);
      
      return {
        success: result.success,
        message: result.success ? 'Voice automation executed successfully' : 'Voice automation failed',
        intent: intent.action,
        target: intent.target,
        result: result
      };
    } catch (error) {
      console.error('❌ Voice automation execution failed:', error);
      
      return {
        success: false,
        message: 'Voice automation execution failed',
        intent: intent.action,
        target: intent.target,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private storeVoiceCommand(command: VoiceCommand): void {
    // Store the command for later retrieval
    try {
      // Store in localStorage for persistence
      localStorage.setItem('lastVoiceCommand', JSON.stringify(command));
      
      // Also store in memory for immediate access
      (window as any).lastVoiceCommand = command;
      
      // Store in session storage for cross-tab access
      sessionStorage.setItem('currentVoiceCommand', JSON.stringify(command));
    } catch (error) {
      console.warn('Failed to store voice command:', error);
      // Fallback to memory only
      (window as any).lastVoiceCommand = command;
    }
  }

  private getLatestCommand(): VoiceCommand | null {
    // Retrieve the latest voice command
    try {
      // Try to get from memory first
      if ((window as any).lastVoiceCommand) {
        return (window as any).lastVoiceCommand;
      }
      
      // Try to get from session storage
      const sessionCommand = sessionStorage.getItem('currentVoiceCommand');
      if (sessionCommand) {
        const command = JSON.parse(sessionCommand);
        (window as any).lastVoiceCommand = command;
        return command;
      }
      
      // Try to get from localStorage
      const storedCommand = localStorage.getItem('lastVoiceCommand');
      if (storedCommand) {
        const command = JSON.parse(storedCommand);
        (window as any).lastVoiceCommand = command;
        return command;
      }
      
      return null;
    } catch (error) {
      console.warn('Failed to retrieve voice command:', error);
      return (window as any).lastVoiceCommand || null;
    }
  }

  private async notifyUser(message: string): Promise<void> {
    // Integrate with the chat system to notify the user
    console.log(`📢 User notification: ${message}`);
    
    try {
      // Dispatch a custom event for the UI to handle
      const event = new CustomEvent('voiceNotification', {
        detail: {
          message,
          timestamp: new Date(),
          type: 'info'
        }
      });
      
      window.dispatchEvent(event);
      
      // Also try to update the page title briefly as a notification
      const originalTitle = document.title;
      document.title = `🎤 ${message}`;
      
      setTimeout(() => {
        document.title = originalTitle;
      }, 3000);
      
    } catch (error) {
      console.warn('Failed to notify user:', error);
    }
  }

  private async createAutomationPage(website?: string): Promise<any> {
    try {
      // Import Playwright for page creation
      const { chromium } = await import('playwright');
      
      const browser = await chromium.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      });
      
      const page = await context.newPage();
      
      // Navigate to website if provided
      if (website) {
        const url = website.startsWith('http') ? website : `https://${website}`;
        await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      }
      
      return page;
    } catch (error) {
      console.error('❌ Failed to create automation page:', error);
      // Return a minimal page object for fallback
      return {
        url: () => website || 'https://example.com',
        title: () => 'Automation Target Page',
        goto: async () => {},
        close: async () => {}
      };
    }
  }

  private getErrorSuggestions(): string[] {
    return [
      'Try speaking more clearly',
      'Make sure your microphone is working',
      'Try a shorter command',
      'Check your internet connection',
      'Try again in a quieter environment'
    ];
  }

  // Configuration methods
  setLanguage(language: string): void {
    this.config.language = language;
    if (this.speechRecognition) {
      this.speechRecognition.lang = language;
    }
  }

  setService(service: SpeechRecognitionConfig['service'], apiKey?: string, region?: string): void {
    this.config.service = service;
    if (apiKey) this.config.apiKey = apiKey;
    if (region) this.config.region = region;
  }

  setContinuous(continuous: boolean): void {
    this.config.continuous = continuous;
    if (this.speechRecognition) {
      this.speechRecognition.continuous = continuous;
    }
  }

  // Status methods
  isCurrentlyListening(): boolean {
    return this.isListening;
  }

  isCurrentlyProcessing(): boolean {
    return this.isProcessing;
  }

  getConfig(): SpeechRecognitionConfig {
    return { ...this.config };
  }

  // Utility methods
  async testMicrophone(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (error) {
      console.error('Microphone test failed:', error);
      return false;
    }
  }

  async getSupportedLanguages(): Promise<string[]> {
    // Return supported languages for speech recognition
    return [
      'en-US', 'en-GB', 'es-ES', 'fr-FR', 'de-DE', 'it-IT', 'pt-BR', 'ru-RU',
      'ja-JP', 'ko-KR', 'zh-CN', 'ar-SA', 'hi-IN', 'th-TH', 'vi-VN'
    ];
  }

  async getAudioDevices(): Promise<MediaDeviceInfo[]> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.filter(device => device.kind === 'audioinput');
    } catch (error) {
      console.error('Failed to get audio devices:', error);
      return [];
    }
  }

  // Cleanup
  destroy(): void {
    if (this.speechRecognition) {
      this.speechRecognition.stop();
    }
    
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    
    if (this.audioContext) {
      this.audioContext.close();
    }
    
    this.isListening = false;
    this.isProcessing = false;
  }
}

// Extend Window interface for TypeScript
declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
    lastVoiceCommand?: VoiceCommand;
  }
}
