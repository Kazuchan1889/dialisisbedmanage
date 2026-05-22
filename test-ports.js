const net = require('net');

const hosts = [
  { host: 'aws-1-ap-southeast-2.pooler.supabase.com', port: 6543 },
  { host: 'aws-1-ap-southeast-2.pooler.supabase.com', port: 5432 },
  { host: 'db.gbkdpkjywtxuihglqial.supabase.co', port: 5432 }
];

hosts.forEach(({ host, port }) => {
  const socket = new net.Socket();
  const start = Date.now();
  
  socket.setTimeout(5000);
  
  socket.on('connect', () => {
    console.log(`✅ CONNECTED to ${host}:${port} in ${Date.now() - start}ms`);
    socket.destroy();
  });
  
  socket.on('timeout', () => {
    console.log(`❌ TIMEOUT ${host}:${port}`);
    socket.destroy();
  });
  
  socket.on('error', (err) => {
    console.log(`❌ ERROR ${host}:${port} - ${err.message}`);
  });
  
  socket.connect(port, host);
});
