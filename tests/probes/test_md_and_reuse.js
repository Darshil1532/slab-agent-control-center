import WebSocket from 'ws';

console.log('Testing WebSocket connection to http://localhost:3000...');

const ws = new WebSocket('ws://localhost:3000');

ws.on('open', () => {
  console.log('Connected to WebSocket server.');

  // Test Hackathon Rule: Reuse the Command (Fast-Path Replay with 0 LLM Tokens)
  console.log('\n--- TEST 1: Reusing Preserved Command (Explore once. Learn the workflow. Reuse the command.) ---');
  ws.send(JSON.stringify({
    action: 'run_learned_command',
    commandName: 'webcmd github repo-inspect --repo facebook/react -f json',
    domain: 'github.com'
  }));
});

let test1Completed = false;

ws.on('message', (data) => {
  const msg = JSON.parse(data.toString());
  console.log(`[WS Event: ${msg.type}]`, msg.message || msg.title || (msg.summary ? 'Executive Summary Emitted' : ''));

  if (msg.type === 'executive_summary') {
    console.log('\n--- VERIFYING UNFORCED MARKDOWN OUTPUT ---');
    const md = msg.markdown || msg.summary;
    console.log('Markdown Length:', md.length);
    console.log('Markdown Preview:\n', md.slice(0, 400));

    // Verify key markdown elements
    const hasHeaders = md.includes('###') || md.includes('##') || md.includes('#');
    const hasRuleCallout = md.includes('Hackathon Rule') || md.includes('Explore once');
    const hasJsonBlock = md.includes('```json');
    const hasTokenSavings = md.includes('Token Savings') || md.includes('0 LLM Tokens');

    console.log('\nValidation Results:');
    console.log('- Contains Markdown Headers:', hasHeaders ? 'PASS' : 'FAIL');
    console.log('- Contains Hackathon Rule Callout:', hasRuleCallout ? 'PASS' : 'FAIL');
    console.log('- Contains Structured JSON Block:', hasJsonBlock ? 'PASS' : 'FAIL');
    console.log('- Mentions Token Savings:', hasTokenSavings ? 'PASS' : 'FAIL');

    if (hasHeaders && hasRuleCallout && hasJsonBlock && hasTokenSavings) {
      console.log('\nSUCCESS: Markdown executive report fully matches requirements!');
      test1Completed = true;
    } else {
      console.error('\nFAILURE: Markdown report did not contain all required sections.');
      process.exit(1);
    }
  }

  if (msg.type === 'run_completed' && test1Completed) {
    console.log('\nSUCCESS: Fast-path replay completed successfully!');
    ws.close();
    process.exit(0);
  }
});

ws.on('error', (err) => {
  console.error('WebSocket error:', err);
  process.exit(1);
});

setTimeout(() => {
  console.error('Test timed out after 20 seconds.');
  process.exit(1);
}, 20000);
