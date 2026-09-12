import fs from 'fs';

const logPath = 'C:/Users/darsh/.gemini/antigravity-ide/brain/28be6053-3902-42e2-adf0-6c5ddf68f9dd/.system_generated/logs/transcript.jsonl';
const content = fs.readFileSync(logPath, 'utf-8');
for (const line of content.split('\n')) {
  if (line.includes('"step_index":1176')) {
    const json = JSON.parse(line);
    console.log('STEP 1176 CONTENT:\n', json.content);
    break;
  }
}
