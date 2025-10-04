// Configure PDF.js worker
const WORKER_URL = new URL(
  'pdfjs-dist/build/pdf.worker.min.js',
  import.meta.url
).toString();

let pdfjsLib: typeof import('pdfjs-dist');

export async function loadPDFJS() {
  if (!pdfjsLib) {
    pdfjsLib = await import('pdfjs-dist');
    pdfjsLib.GlobalWorkerOptions.workerSrc = WORKER_URL;
  }
  return pdfjsLib;
}

export async function loadXLSX() {
  return import('sheetjs-style');
}

export async function loadTesseract() {
  return import('tesseract.js');
}

export async function loadMammoth() {
  return import('mammoth');
}