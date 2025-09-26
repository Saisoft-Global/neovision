import { ProcessDocumentResponse, Document } from './types/document';
import { processDocumentAPI } from './api/document';

export const processDocument = async (document: Document): Promise<ProcessDocumentResponse> => {
  try {
    const response = await fetch(document.url);
    const blob = await response.blob();
    const file = new File([blob], document.name, { type: document.type });
    
    return await processDocumentAPI(file);
  } catch (error) {
    console.error('Error processing document:', error);
    throw new Error('Failed to process document');
  }
};

export const createDocument = (file: File): Document => ({
  id: Date.now().toString(),
  name: file.name,
  type: file.type,
  url: URL.createObjectURL(file),
  status: 'processing',
  documentType: '',
  fields: [],
  createdAt: new Date().toISOString(),
});

export const revokeDocumentUrl = (document: Document) => {
  if (document.url.startsWith('blob:')) {
    URL.revokeObjectURL(document.url);
  }
};

// Simple in-memory de-dupe for in-flight bbox calls (keyed by file name + bbox)
const inflight: Map<string, Promise<string>> = new Map();
let debounceTimer: any = null;
let pendingRequest: {
  key: string;
  exec: () => Promise<string>;
} | null = null;

export const extractByBbox = async (
  file: File,
  bbox: [number, number, number, number],
  canvasSize?: { width: number; height: number }
): Promise<string> => {
  const key = `${file.name}:${bbox.join(',')}:${canvasSize?.width || 0}x${canvasSize?.height || 0}`;
  if (inflight.has(key)) {
    return inflight.get(key)!;
  }

  const exec = async (): Promise<string> => {
    const form = new FormData();
    form.append('file', file);
    form.append('x', String(bbox[0]));
    form.append('y', String(bbox[1]));
    form.append('width', String(bbox[2]));
    form.append('height', String(bbox[3]));
    if (canvasSize) {
      form.append('canvas_width', String(canvasSize.width));
      form.append('canvas_height', String(canvasSize.height));
    }

    console.log('ExtractByBbox request:', {
      bbox,
      canvasSize,
      fileName: file.name
    });

    const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/inference/extract-by-bbox`, {
      method: 'POST',
      body: form
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error('BBox extraction failed:', res.status, errorText);
      throw new Error(`BBox extraction failed: ${res.status} ${errorText}`);
    }
    
    const data = await res.json();
    console.log('ExtractByBbox response:', data);
    return data.text || '';
  };

  // Debounce by 250ms to avoid floods during rapid interactions
  const promise = new Promise<string>((resolve, reject) => {
    pendingRequest = { key, exec };
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
      if (!pendingRequest) return;
      const { key: runKey, exec: runExec } = pendingRequest;
      pendingRequest = null;
      const p = runExec();
      inflight.set(runKey, p);
      try {
        const result = await p;
        resolve(result);
      } catch (e) {
        reject(e);
      } finally {
        inflight.delete(runKey);
      }
    }, 250);
  });

  inflight.set(key, promise);
  return promise;
};