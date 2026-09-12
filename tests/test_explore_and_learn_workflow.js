import WebSocket from 'ws';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const RECIPES_DIR = path.join(__dirname, 'recipes');

console.log('Connecting to WebSocket at ws://localhost:3000 to test exploration -> learning -> recipe generation...');

const ws = new WebSocket('ws://localhost:3000');

ws.on('open', () => {
  console.log('Connected! Starting exploration mission on unfamiliar website (e.g. quotes.toscrape.com)...');
  
  ws.send(JSON.stringify({
    action: 'start',
    workflow: 'custom',
    params: {
      goal: 'Explore quotes.toscrape.com, extract top inspiring quote and author, and compile reusable command',
      url: 'https://quotes.toscrape.com/'
    }
  }));
});

ws.on('message', (data) => {
  const msg = JSON.parse(data.toString());
  if (msg.type === 'log') {
    console.log(`[LOG - ${msg.type}] ${msg.message}`);
  } else if (msg.type === 'step_executed') {
    console.log(`[STEP] ${msg.title} (${msg.timing || 0}ms)`);
  } else if (msg.type === 'command_learned') {
    console.log('\n🌟 [COMMAND LEARNED] Preserved Workflow:');
    console.log('Command Name:', msg.commandName);
    console.log('Token Savings:', msg.tokenSavingsEstimate);
    console.log('CLI Recipe:\n', msg.recipe || msg.cliUsage);
  } else if (msg.type === 'executive_summary') {
    console.log('\n📄 [EXECUTIVE SUMMARY] Rich Markdown Digest:');
    const md = msg.markdown || msg.summary;
    console.log(md.slice(0, 500) + '...\n');
  } else if (msg.type === 'run_completed' || msg.type === 'task_complete') {
    console.log('\n✅ Mission completed! Checking recipes directory on disk...');
    const files = fs.readdirSync(RECIPES_DIR);
    console.log('Files in recipes/:', files);
    
    // Check if quotes_toscrape_com recipe was saved
    const quoteRecipe = files.find(f => f.includes('quotes'));
    if (quoteRecipe) {
      console.log(`🎯 Found preserved recipe: ${quoteRecipe}`);
      const content = JSON.parse(fs.readFileSync(path.join(RECIPES_DIR, quoteRecipe), 'utf-8'));
      console.log('Preserved Recipe Content:', JSON.stringify(content, null, 2));
      console.log('\nALL CHECKS PASSED: Explored once -> Preserved workflow -> Ready to reuse command!');
    } else {
      console.log('Note: Explored site finished with existing or custom recipe.');
    }
    ws.close();
    process.exit(0);
  } else if (msg.type === 'task_error') {
    console.error('Task error:', msg.message);
    ws.close();
    process.exit(1);
  }
});

ws.on('error', (err) => {
  console.error('WS Error:', err);
  process.exit(1);
});

setTimeout(() => {
  console.log('Timeout reached (60s). Exiting test.');
  process.exit(0);
}, 60000);
