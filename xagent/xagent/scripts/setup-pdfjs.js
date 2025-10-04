import { copyFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, join } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const __dirname = fileURLToPath(new URL('.', import.meta.url));

async function setupPDFJS() {
  try {
    const projectRoot = resolve(__dirname, '..');
    const publicDir = join(projectRoot, 'public');

    // Create public directory if it doesn't exist
    if (!existsSync(publicDir)) {
      mkdirSync(publicDir, { recursive: true });
    }

    // Get path to PDF.js worker
    const pdfjsPath = require.resolve('pdfjs-dist/build/pdf.worker.min.js');
    const destPath = join(publicDir, 'pdf.worker.min.js');

    // Copy worker file
    copyFileSync(pdfjsPath, destPath);
    console.log('PDF.js worker file copied successfully');

    // Create standard fonts directory
    const standardFontsDir = join(publicDir, 'standard_fonts');
    if (!existsSync(standardFontsDir)) {
      mkdirSync(standardFontsDir, { recursive: true });
    }

    // Copy standard fonts
    const standardFontsPath = join(require.resolve('pdfjs-dist/package.json'), '../standard_fonts');
    if (existsSync(standardFontsPath)) {
      const fontFiles = [
        'Times-Roman.bf',
        'Times-Bold.bf',
        'Times-Italic.bf',
        'Times-BoldItalic.bf',
        'Helvetica.bf',
        'Helvetica-Bold.bf',
        'Helvetica-Oblique.bf',
        'Helvetica-BoldOblique.bf',
        'Courier.bf',
        'Courier-Bold.bf',
        'Courier-Oblique.bf',
        'Courier-BoldOblique.bf',
        'Symbol.bf',
        'ZapfDingbats.bf'
      ];

      fontFiles.forEach(font => {
        const srcFont = join(standardFontsPath, font);
        const destFont = join(standardFontsDir, font);
        if (existsSync(srcFont)) {
          copyFileSync(srcFont, destFont);
        }
      });
    }

    console.log('PDF.js setup completed successfully');
  } catch (error) {
    console.error('Error setting up PDF.js:', error);
    process.exit(1);
  }
}

setupPDFJS();