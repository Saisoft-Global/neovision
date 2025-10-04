export async function loadXLSX() {
  try {
    const XLSX = await import('sheetjs-style');
    return XLSX.default || XLSX;
  } catch (error) {
    console.error('Failed to load XLSX library:', error);
    throw new Error('Failed to initialize spreadsheet processor');
  }
}