const fs = require('fs');
const lines = fs.readFileSync('src/app/(protected)/scheduler/page.tsx', 'utf8').split('\n');
lines.forEach((l, i) => {
  if (l.match(/[^\x00-\x7F]/)) {
    console.log(`Line ${i + 1}: ${l.trim()}`);
  }
});
