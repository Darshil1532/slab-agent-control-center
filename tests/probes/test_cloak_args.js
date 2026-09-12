import { buildArgs } from 'file:///C:/Users/darsh/AppData/Roaming/npm/node_modules/@agentrhq/webcmd/node_modules/cloakbrowser/dist/args.js';
import { getDefaultStealthArgs } from 'file:///C:/Users/darsh/AppData/Roaming/npm/node_modules/@agentrhq/webcmd/node_modules/cloakbrowser/dist/config.js';

console.log('Default stealth args:');
console.log(getDefaultStealthArgs());

const args = buildArgs({ headless: false });
console.log('\nBuild args (headless: false):');
console.log(args);
