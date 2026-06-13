const fs = require('fs');
let c = fs.readFileSync('src/app/(protected)/scheduler/page.tsx', 'utf8');

const replacements = {
  'Ã¢â‚¬â€œ': '-',
  'Ã¢â‚¬â€ ': '—',
  'Ã‚Â·': '•',
  'Ã¢â€ â€™': '→',
  'Ã°Å¸â€œâ€¦': '📅',
  'Ã°Å¸â€˜Â¤': '👤',
  'Ã°Å¸â€”â€˜Ã¯Â¸Â': '🗑️',
  'Ã¢Å“â€œ': '✔️',
  'Ã¢Å¡Â Ã¯Â¸Â': '⚠️',
  'Ã¢Å“â€¦': '✅',
  'Ã°Å¸â€ Â§': '🔧',
  'Ã°Å¸â€œÂ­': '📭',
  'Ã¢â€¢Â': '═',
  'Ã¢â€ â‚¬': '─'
};

for (const [bad, good] of Object.entries(replacements)) {
  c = c.split(bad).join(good);
}

fs.writeFileSync('src/app/(protected)/scheduler/page.tsx', c);
console.log("Replaced all specific mojibakes!");
