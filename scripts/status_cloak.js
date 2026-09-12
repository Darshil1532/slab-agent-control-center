import { execSync } from 'child_process';

try {
  const output = execSync('powershell -NoProfile -Command "Get-Process chrome | Select-Object Id, Path, MainWindowTitle | ConvertTo-Json"', { encoding: 'utf-8' });
  const list = JSON.parse(output);
  const items = Array.isArray(list) ? list : [list];
  const cloakItems = items.filter(item => (item.Path || '').toLowerCase().includes('cloak'));
  console.log(`Active Cloak instances: ${cloakItems.length}`);
  for (const item of cloakItems) {
    console.log(`  - PID ${item.Id}: Title="${item.MainWindowTitle || '(background/tab)'}"`);
  }
} catch (e) {
  console.log('Error checking cloak:', e.message);
}
