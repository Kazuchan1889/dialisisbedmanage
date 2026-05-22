const { Client } = require('pg');

const connectionString = "postgresql://postgres.gbkdpkjywtxuihglqial:REgk1n151n55o8Kh@aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres";

const client = new Client({
  connectionString: connectionString,
  ssl: {
    rejectUnauthorized: false
  }
});

console.log("Connecting...");
client.connect()
  .then(() => {
    console.log("✅ CONNECTED successfully!");
    return client.query("SELECT NOW()");
  })
  .then(res => {
    console.log("Query result:", res.rows[0]);
    return client.end();
  })
  .catch(err => {
    console.error("❌ ERROR CONNECTING:", err);
  });
