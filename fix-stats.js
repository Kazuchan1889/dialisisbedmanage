const fs = require('fs');
let c = fs.readFileSync('src/app/(protected)/scheduler/page.tsx', 'utf8');

c = c.replace(/\{ label: 'Total Bed', value: stats\.totalBeds, icon: '[^']+', color: '#1e6fa6', bg: '#eff6ff' \}/, 
  "{ label: 'Total Bed', value: stats.totalBeds, icon: '🛏️', color: '#1e6fa6', bg: '#eff6ff' }");
c = c.replace(/\{ label: 'Jadwal Pasien', value: stats\.totalPatSch, icon: '[^']+', color: '#059669', bg: '#f0fdf4' \}/, 
  "{ label: 'Jadwal Pasien', value: stats.totalPatSch, icon: '👥', color: '#059669', bg: '#f0fdf4' }");
c = c.replace(/\{ label: 'Bed Ada Perawat', value: stats\.bedsWithNurse, icon: '[^']+', color: '#7c3aed', bg: '#f5f3ff' \}/, 
  "{ label: 'Bed Ada Perawat', value: stats.bedsWithNurse, icon: '👩‍⚕️', color: '#7c3aed', bg: '#f5f3ff' }");
c = c.replace(/\{ label: 'Perawat Bertugas', value: stats\.uniqueNurses, icon: '[^']+', color: '#d97706', bg: '#fffbeb' \}/, 
  "{ label: 'Perawat Bertugas', value: stats.uniqueNurses, icon: '⭐', color: '#d97706', bg: '#fffbeb' }");
c = c.replace(/\{ label: 'Total Jadwal Ns', value: stats\.totalNurseSch, icon: '[^']+', color: '#dc2626', bg: '#fef2f2' \}/, 
  "{ label: 'Total Jadwal Ns', value: stats.totalNurseSch, icon: '📝', color: '#dc2626', bg: '#fef2f2' }");

c = c.replace(/\{ key: 'beds',     label: '[^']+Timeline Bed' \}/, "{ key: 'beds',     label: '🛏️ Timeline Bed' }");
c = c.replace(/\{ key: 'patients', label: '[^']+Jadwal Pasien' \}/, "{ key: 'patients', label: '👥 Jadwal Pasien' }");
c = c.replace(/\{ key: 'nurses',   label: '[^']+Jadwal Perawat' \}/, "{ key: 'nurses',   label: '👩‍⚕️ Jadwal Perawat' }");

fs.writeFileSync('src/app/(protected)/scheduler/page.tsx', c);
console.log("Fixed stats cards!");
