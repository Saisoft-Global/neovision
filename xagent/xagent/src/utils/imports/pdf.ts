// Configure PDF.js worker
const WORKER_URL = '/pdf.worker.min.js';

let pdfjsLib: typeof import('pdfjs-dist');
let workerLoaded = false;
let initializationPromise: Promise<void> | null = null;

export async function loadPDFJS() {
  if (!pdfjsLib) {
    try {
      pdfjsLib = await import('pdfjs-dist');
      
      if (!workerLoaded) {
        if (!initializationPromise) {
          initializationPromise = initializeWorker();
        }
        await initializationPromise;
      }
    } catch (error) {
      console.error('Failed to load PDF.js:', error);
      throw new Error('Failed to initialize PDF processor');
    }
  }
  return pdfjsLib;
}

async function initializeWorker(): Promise<void> {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = WORKER_URL;
    
    // Test worker initialization with minimal PDF
    const testData = new Uint8Array([
      0x25, 0x50, 0x44, 0x46, // %PDF
      0x2D, 0x31, 0x2E, 0x34, // -1.4
      0x0A, 0x25, 0xE2, 0xE3, // Header
      0x0A, 0x0A             // EOF
    ]);

    const testLoadingTask = pdfjsLib.getDocument({
      data: testData,
      useWorkerFetch: true,
      standardFontDataUrl: '/standard_fonts/',
    });

    await testLoadingTask.promise;
    await testLoadingTask.destroy();
    
    workerLoaded = true;
    initializationPromise = null;
  } catch (error) {
    workerLoaded = false;
    initializationPromise = null;
    throw error;
  }
}

export function isPDFJSLoaded(): boolean {
  return Boolean(pdfjsLib && workerLoaded);
}