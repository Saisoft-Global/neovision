// Facial recognition service with graceful fallback for missing dependencies
let faceapi: any = null;

try {
  faceapi = require('face-api.js');
} catch (error) {
  console.warn('face-api.js not available, facial recognition will use fallback');
}

export class FacialRecognitionService {
  private isAvailable: boolean = !!faceapi;
  private modelsLoaded: boolean = false;

  async loadModels() {
    if (!this.isAvailable) {
      console.warn('Facial recognition not available, models not loaded');
      return Promise.resolve();
    }

    try {
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
        faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
        faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
        faceapi.nets.faceExpressionNet.loadFromUri('/models')
      ]);
      this.modelsLoaded = true;
    } catch (error) {
      console.error('Failed to load facial recognition models:', error);
      this.isAvailable = false;
    }
  }

  async detectFaces(imageElement: HTMLImageElement | HTMLVideoElement | string) {
    if (!this.isAvailable || !this.modelsLoaded) {
      console.warn('Facial recognition not available, simulating face detection');
      return Promise.resolve([]);
    }

    try {
      let detections;
      if (typeof imageElement === 'string') {
        // Image data URL or path
        const img = await faceapi.fetchImage(imageElement);
        detections = await faceapi.detectAllFaces(img).withFaceLandmarks().withFaceDescriptors();
      } else {
        detections = await faceapi.detectAllFaces(imageElement).withFaceLandmarks().withFaceDescriptors();
      }
      return detections;
    } catch (error) {
      console.error('Face detection failed:', error);
      throw error;
    }
  }

  async recognizeFace(imageElement: HTMLImageElement | HTMLVideoElement | string) {
    if (!this.isAvailable || !this.modelsLoaded) {
      console.warn('Facial recognition not available, simulating face recognition');
      return Promise.resolve(null);
    }

    try {
      const detections = await this.detectFaces(imageElement);
      if (detections.length > 0) {
        // Return the first detected face with recognition data
        return {
          descriptor: detections[0].descriptor,
          landmarks: detections[0].landmarks,
          expressions: detections[0].expressions
        };
      }
      return null;
    } catch (error) {
      console.error('Face recognition failed:', error);
      throw error;
    }
  }

  async extractFacialFeatures(imageElement: HTMLImageElement | HTMLVideoElement | string) {
    if (!this.isAvailable || !this.modelsLoaded) {
      console.warn('Facial recognition not available, simulating feature extraction');
      return Promise.resolve({
        expressions: { neutral: 1, happy: 0, sad: 0, angry: 0, fearful: 0, disgusted: 0, surprised: 0 },
        landmarks: [],
        age: null,
        gender: null
      });
    }

    try {
      const detections = await this.detectFaces(imageElement);
      if (detections.length > 0) {
        const detection = detections[0];
        return {
          expressions: detection.expressions || { neutral: 1, happy: 0, sad: 0, angry: 0, fearful: 0, disgusted: 0, surprised: 0 },
          landmarks: detection.landmarks ? detection.landmarks.positions : [],
          age: null, // Would need additional model
          gender: null // Would need additional model
        };
      }
      return null;
    } catch (error) {
      console.error('Feature extraction failed:', error);
      throw error;
    }
  }

  isFacialRecognitionAvailable(): boolean {
    return this.isAvailable && this.modelsLoaded;
  }
}

export const facialRecognitionService = new FacialRecognitionService();