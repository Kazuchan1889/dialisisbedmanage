const fs = require('fs');
let c = fs.readFileSync('src/app/(protected)/scheduler/page.tsx', 'utf8');

c = c.split('Ã°Å¸â€ Â§').join('⚙️'); // Let's just use ⚙️ (gear) since it's used elsewhere for Teknisi
c = c.split('Ã¢â€ â‚¬').join('─');

fs.writeFileSync('src/app/(protected)/scheduler/page.tsx', c);
console.log("Cleaned up final non-ascii artifacts!");
