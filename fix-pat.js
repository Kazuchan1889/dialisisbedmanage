const fs = require('fs');
let c = fs.readFileSync('src/app/(protected)/scheduler/page.tsx', 'utf8');

c = c.replace(/<div style=\{\{ width: 36, height: 36, borderRadius: 10, background: 'rgba\(255,255,255,0\.2\)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 \}\}>[^<]+<\/div>/g, 
  `<div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>👤</div>`);

fs.writeFileSync('src/app/(protected)/scheduler/page.tsx', c);
console.log("Fixed patient icon!");
