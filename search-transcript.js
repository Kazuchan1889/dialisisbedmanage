const fs = require('fs');
const readline = require('readline');
const path = require('path');

const logPath = 'C:\\Users\\LENOVO\\.gemini\\antigravity\\brain\\ec02f241-2e1d-4b01-8a01-740defbc020f\\.system_generated\\logs\\transcript.jsonl';

const rl = readline.createInterface({
  input: fs.createReadStream(logPath),
  crlfDelay: Infinity
});

rl.on('line', (line) => {
  if (line.includes('prisma') || line.includes('migrate') || line.includes('seed') || line.includes('db')) {
    try {
      const obj = JSON.parse(line);
      console.log(`Step ${obj.step_index} (${obj.source}/${obj.type}):`);
      if (obj.content) {
        console.log(`  Content snippet: ${obj.content.substring(0, 150)}...`);
      }
      if (obj.tool_calls) {
        obj.tool_calls.forEach(tc => {
          console.log(`  Tool Call: ${tc.name} with args: ${JSON.stringify(tc.args).substring(0, 150)}`);
        });
      }
    } catch (e) {
      console.log("Failed parsing line", e);
    }
  }
});
