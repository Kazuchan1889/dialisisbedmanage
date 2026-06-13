const fs = require('fs');
let c = fs.readFileSync('src/app/(protected)/scheduler/page.tsx', 'utf8');

c = c.replace(/emoji:\s*'[^']+',\s*timeRange:\s*'[^']+'/g, (m) => {
  if (m.includes('06:30')) return "emoji: '🌅', timeRange: '06:30 - 11:30'";
  if (m.includes('12:30')) return "emoji: '☀️', timeRange: '12:30 - 17:30'";
  if (m.includes('17:30')) return "emoji: '🌙', timeRange: '17:30 - 00:00'";
  return m;
});
c = c.replace(/emoji:\s*'[^']+',\s*timeRange:\s*'',\s*defaultStart:\s*'08:00'/, "emoji: '⏱️', timeRange: '', defaultStart: '08:00'");

c = c.replace(/<div style=\{\{ fontSize: 40, marginBottom: 12 \}\}>[^<]+<\/div>\s*<div style=\{\{ fontSize: 14, fontWeight: 600 \}\}>Belum ada pasien yang dijadwalkan<\/div>/g, 
  '<div style={{ fontSize: 40, marginBottom: 12 }}>🛏️</div>\n                <div style={{ fontSize: 14, fontWeight: 600 }}>Belum ada pasien yang dijadwalkan</div>');

c = c.replace(/<div style=\{\{ fontSize: 40, marginBottom: 12 \}\}>[^<]+<\/div>\s*<div style=\{\{ fontSize: 14, fontWeight: 600 \}\}>Belum ada perawat yang dijadwalkan<\/div>/g, 
  '<div style={{ fontSize: 40, marginBottom: 12 }}>👩‍⚕️</div>\n              <div style={{ fontSize: 14, fontWeight: 600 }}>Belum ada perawat yang dijadwalkan</div>');

c = c.replace(/\{nurse\.role === 'TECHNICIAN' \? '[^']+' : '[^']+'\}/g, 
  `{nurse.role === 'TECHNICIAN' ? '⚙️ Teknisi' : '🩺 Perawat / Staff'}`);

c = c.replace(/\{bed\.machine && <span style=\{\{ fontSize: 10, color: '#059669', fontWeight: 600, marginLeft: 'auto' \}\}>[^<]+\{bed\.machine\.machineCode\}<\/span>\}/g, 
  `{bed.machine && <span style={{ fontSize: 10, color: '#059669', fontWeight: 600, marginLeft: 'auto' }}>⚙️ {bed.machine.machineCode}</span>}`);

c = c.replace(/\{bed\.machine && <div style=\{\{ fontSize: 9, color: '#059669', fontWeight: 600 \}\}>[^<]+\{bed\.machine\.machineCode\}<\/div>\}/g, 
  `{bed.machine && <div style={{ fontSize: 9, color: '#059669', fontWeight: 600 }}>⚙️ {bed.machine.machineCode}</div>}`);

c = c.replace(/<div style=\{\{ padding: '4px 14px', background: 'linear-gradient\(135deg,#1e6fa6,#2563eb\)', color: '#fff', borderRadius: 8, fontSize: 12, fontWeight: 800 \}\}>[^<]+Lantai \{floor\}<\/div>/g, 
  `<div style={{ padding: '4px 14px', background: 'linear-gradient(135deg,#1e6fa6,#2563eb)', color: '#fff', borderRadius: 8, fontSize: 12, fontWeight: 800 }}>🏢 Lantai {floor}</div>`);

c = c.replace(/<span style=\{\{ fontSize: 11, color: '#64748b' \}\}>Lantai \{bed\.floor\} [^<]+\{bed\.section\}<\/span>/g, 
  `<span style={{ fontSize: 11, color: '#64748b' }}>Lantai {bed.floor} • {bed.section}</span>`);

c = c.replace(/<div style=\{\{ fontSize: 10, color: '#64748b' \}\}>Lantai \{bed\.floor\} [^<]+\{bed\.section\}\{scheduledPatientName \? \` [^<]+\$\{scheduledPatientName\}\` : ''\}<\/div>/g, 
  `<div style={{ fontSize: 10, color: '#64748b' }}>Lantai {bed.floor} • {bed.section}{scheduledPatientName ? \` • \${scheduledPatientName}\` : ''}</div>`);

c = c.replace(/<span style=\{\{ fontSize: 9, color: shift\.color, opacity: 0\.7 \}\}>[^<]+\{scheduledPatName\.split\(' '\)\[0\]\}<\/span>/g, 
  `<span style={{ fontSize: 9, color: shift.color, opacity: 0.7 }}>• {scheduledPatName.split(' ')[0]}</span>`);

c = c.replace(/<span style=\{\{ fontSize: 9, color: shift\.color, opacity: 0\.8 \}\}>[^<]+\{new Date\(schedule\.startTime\)/g, 
  `<span style={{ fontSize: 9, color: shift.color, opacity: 0.8 }}>• {new Date(schedule.startTime)`);

fs.writeFileSync('src/app/(protected)/scheduler/page.tsx', c);
console.log("Fixed!");
