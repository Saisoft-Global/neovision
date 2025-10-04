import * as faceapi from 'face-api.js';

export class FacialRecognitionService {
  private modelsLoaded = false;

  async loadModels() {
    if (this.modelsLoaded) return;

    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
      faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
      faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
    ]);

    this.modelsLoaded = true;
  }

  async detectFaces(imageElement: HTMLImageElement | HTMLVideoElement) {
    if (!this.modelsLoaded) {
      await this.loadModels();
    }

    const detections = await faceapi
      .detectAllFaces(imageElement, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptors();

    return detections;
  }

  async compareFaces(face1: Float32Array, face2: Float32Array) {
    const distance = faceapi.euclideanDistance(face1, face2);
    return distance < 0.6; // Threshold for face matching
  }
} 