const fs = require('fs');
const lines = fs.readFileSync('src/app/(protected)/scheduler/page.tsx', 'utf8').split('\n');

// Restore lines around 925
lines[926] = "      <div style={{ display: 'inline-flex', background: '#f1f5f9', padding: 4, borderRadius: 10, marginBottom: 20 }}>";
lines[927] = "        {([";
lines[928] = "          { key: 'beds',     label: '🛏️ Timeline Bed' },";
lines[929] = "          { key: 'patients', label: '👥 Jadwal Pasien' },";
lines[930] = "          { key: 'nurses',   label: '👩‍⚕️ Jadwal Perawat' },";

fs.writeFileSync('src/app/(protected)/scheduler/page.tsx', lines.join('\n'));
console.log("Restored JSX structure!");
