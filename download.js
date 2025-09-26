const fs = require('fs');
const archiver = require('archiver');

// Create output stream
const output = fs.createWriteStream('idp-portal.zip');
const archive = archiver('zip', {
  zlib: { level: 9 }
});

// Listen for errors
archive.on('error', (err) => {
  throw err;
});

// Pipe archive data to the output file
archive.pipe(output);

// Add files
archive.directory('src/', 'src');
archive.directory('backend/', 'backend');
archive.file('package.json', { name: 'package.json' });
archive.file('tsconfig.json', { name: 'tsconfig.json' });
archive.file('vite.config.ts', { name: 'vite.config.ts' });
archive.file('index.html', { name: 'index.html' });
archive.file('README.md', { name: 'README.md' });

// Finalize the archive
archive.finalize();