import { createRequire } from 'module';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import https from 'https';

const require = createRequire(import.meta.url);
const modelsDir = join(process.cwd(), 'public', 'models');

const models = [
  {
    name: 'tiny_face_detector_model-weights_manifest.json',
    url: 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/tiny_face_detector_model-weights_manifest.json'
  },
  {
    name: 'tiny_face_detector_model-shard1',
    url: 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/tiny_face_detector_model-shard1'
  },
  {
    name: 'face_landmark_68_model-weights_manifest.json',
    url: 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_landmark_68_model-weights_manifest.json'
  },
  {
    name: 'face_landmark_68_model-shard1',
    url: 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_landmark_68_model-shard1'
  },
  {
    name: 'face_recognition_model-weights_manifest.json',
    url: 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_recognition_model-weights_manifest.json'
  },
  {
    name: 'face_recognition_model-shard1',
    url: 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_recognition_model-shard1'
  }
];

async function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    };

    https.get(url, options, (response) => {
      if (response.statusCode === 200) {
        const chunks = [];
        response.on('data', chunk => chunks.push(chunk));
        response.on('end', async () => {
          try {
            const buffer = Buffer.concat(chunks);
            await writeFile(dest, buffer);
            resolve(dest);
          } catch (error) {
            reject(error);
          }
        });
      } else if (response.statusCode === 302 || response.statusCode === 301) {
        // Handle redirect
        const redirectUrl = response.headers.location;
        if (!redirectUrl) {
          reject(new Error('Redirect URL not found'));
          return;
        }
        downloadFile(redirectUrl, dest)
          .then(resolve)
          .catch(reject);
      } else {
        response.resume();
        reject(new Error(`Request Failed With a Status Code: ${response.statusCode}`));
      }
    }).on('error', reject);
  });
}

async function setupFaceApi() {
  try {
    await mkdir(modelsDir, { recursive: true });
    console.log('Created models directory');

    for (const model of models) {
      const dest = join(modelsDir, model.name);
      console.log(`Downloading ${model.name}...`);
      await downloadFile(model.url, dest);
      console.log(`Downloaded ${model.name}`);
    }

    console.log('Face API models setup completed successfully');
  } catch (error) {
    console.error('Error setting up Face API models:', error);
    process.exit(1);
  }
}

setupFaceApi(); 