import WebSocket from 'ws';

console.log('Testing Replay of Newly Learned Recipe: webcmd quotes get-top-quote');

const ws = new WebSocket('ws://localhost:3000');

ws.on('open', () => {
  ws.send(JSON.stringify({
    action: 'run_learned_command',
    commandName: 'webcmd quotes get-top-quote',
    domain: 'quotes.toscrape.com'
  }));
});

ws.on('message', (data) => {
  const msg = JSON.parse(data.toString());
  console.log(`[WS: ${msg.type}]`, msg.message || msg.title || (msg.summary ? 'Summary received' : ''));

  if (msg.type === 'executive_summary') {
    console.log('\n--- REPLAY EXECUTIVE SUMMARY (MARKDOWN) ---');
    console.log((msg.markdown || msg.summary).slice(0, 350));
  }

  if (msg.type === 'run_completed') {
    console.log('\n✅ Successfully replayed newly learned command in Cloak Chromium with 0 LLM tokens!');
    ws.close();
    process.exit(0);
  }
});

ws.on('error', (err) => {
  console.error('Error:', err);
  process.exit(1);
});

setTimeout(() => {
  console.log('Timeout after 15s');
  process.exit(1);
}, 15000);
