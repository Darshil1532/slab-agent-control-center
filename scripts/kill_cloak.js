import { execSync } from 'child_process';

try {
  const output = execSync('powershell -NoProfile -Command "Get-Process chrome | Select-Object Id, Path | ConvertTo-Json"', { encoding: 'utf-8' });
  const list = JSON.parse(output);
  const items = Array.isArray(list) ? list : [list];
  for (const item of items) {
    if ((item.Path || '').toLowerCase().includes('cloak')) {
      try {
        process.kill(item.Id);
        console.log('Killed PID:', item.Id);
      } catch (e) {}
    }
  }
} catch (e) {
  console.log('No processes to kill or error:', e.message);
}
console.log('Done cleaning cloak.');
