const fs = require('fs');
const lines = fs.readFileSync('src/app/(protected)/scheduler/page.tsx', 'utf8').split('\n');

lines[911] = "          { label: 'Total Bed', value: stats.totalBeds, icon: '🛏️', color: '#1e6fa6', bg: '#eff6ff' },";
lines[912] = "          { label: 'Jadwal Pasien', value: stats.totalPatSch, icon: '👥', color: '#059669', bg: '#f0fdf4' },";
lines[913] = "          { label: 'Bed Ada Perawat', value: stats.bedsWithNurse, icon: '👩‍⚕️', color: '#7c3aed', bg: '#f5f3ff' },";
lines[914] = "          { label: 'Perawat Bertugas', value: stats.uniqueNurses, icon: '⭐', color: '#d97706', bg: '#fffbeb' },";
lines[915] = "          { label: 'Total Jadwal Ns', value: stats.totalNurseSch, icon: '📝', color: '#dc2626', bg: '#fef2f2' },";

lines[926] = "            { key: 'beds',     label: '🛏️ Timeline Bed' },";
lines[927] = "            { key: 'patients', label: '👥 Jadwal Pasien' },";
lines[928] = "            { key: 'nurses',   label: '👩‍⚕️ Jadwal Perawat' },";

fs.writeFileSync('src/app/(protected)/scheduler/page.tsx', lines.join('\n'));
console.log("Replaced lines directly!");
