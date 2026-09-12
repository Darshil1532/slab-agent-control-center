import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const targetPath = path.join(__dirname, '..', 'node_modules', '@agentrhq', 'webcmd', 'dist', 'src', 'browser', 'runtime', 'local-cloak', 'chrome-launch.js');

if (fs.existsSync(targetPath)) {
  let content = fs.readFileSync(targetPath, 'utf8');
  if (content.includes('windowsHide: true')) {
    content = content.replace(
      'windowsHide: true',
      "windowsHide: (process.env.WEBCMD_WINDOW === 'hidden')"
    );
    fs.writeFileSync(targetPath, content, 'utf8');
    console.log('✅ Successfully patched webcmd chrome-launch.js for desktop window visibility!');
  } else {
    console.log('ℹ️ webcmd chrome-launch.js is already patched for visibility.');
  }
} else {
  console.log('ℹ️ webcmd chrome-launch.js not found, skipping patch.');
}
