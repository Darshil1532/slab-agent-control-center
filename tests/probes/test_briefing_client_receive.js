import WebSocket from 'ws';

console.log('Connecting to WebSocket to test briefing run...');
const ws = new WebSocket('ws://localhost:3000');

ws.on('open', () => {
  console.log('WS Open. Sending start briefing...');
  ws.send(JSON.stringify({
    action: 'start',
    workflow: 'briefing',
    params: {
      query: 'Check Hacker News, Bloomberg, and CoinDesk, filter out hype/sponsored posts, and give me a 3-minute bulleted digest of major macro tech shifts today.',
      goal: 'Check Hacker News, Bloomberg, and CoinDesk, filter out hype/sponsored posts, and give me a 3-minute bulleted digest of major macro tech shifts today.'
    }
  }));
});

const receivedEvents = [];

ws.on('message', (data) => {
  const msg = JSON.parse(data.toString());
  receivedEvents.push(msg.type);
  console.log(`[EVENT: ${msg.type}]`, msg.title || msg.message || (msg.summary ? 'Summary length: ' + (msg.summary?.length || 0) : ''));

  if (msg.type === 'executive_summary') {
    console.log('\n=== EXECUTIVE SUMMARY EVENT DETAILS ===');
    console.log('Keys on msg:', Object.keys(msg));
    console.log('typeof summary:', typeof msg.summary);
    console.log('typeof markdown:', typeof msg.markdown);
    console.log('typeof report:', typeof msg.report);
    console.log('Preview:\n', (msg.markdown || msg.summary || '').slice(0, 300));
  }

  if (msg.type === 'run_completed' || msg.type === 'task_complete') {
    console.log('\n=== RUN COMPLETED EVENT ===');
    console.log('Keys on completion event:', Object.keys(msg));
    ws.close();
    process.exit(0);
  }
});

ws.on('error', (err) => {
  console.error('WS Error:', err);
  process.exit(1);
});

setTimeout(() => {
  console.log('Timeout. Received events:', receivedEvents);
  process.exit(0);
}, 30000);
