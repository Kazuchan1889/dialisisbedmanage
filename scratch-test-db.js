const { Client } = require('pg');

const urls = [
  {
    url: "postgresql://postgres.gbkdpkjywtxuihglqial:cJUhl6IRWigCbMOh@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres",
    label: "Pooler Port 6543 (pgbouncer)"
  },
  {
    url: "postgresql://postgres.gbkdpkjywtxuihglqial:cJUhl6IRWigCbMOh@aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres",
    label: "Pooler Port 5432"
  }
];

async function test() {
  for (const item of urls) {
    console.log(`Testing: ${item.label}...`);
    const client = new Client({
      connectionString: item.url,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 5000
    });
    try {
      await client.connect();
      console.log(`✅ Success for ${item.label}!`);
      const res = await client.query("SELECT NOW()");
      console.log(`   Time: ${res.rows[0].now}`);
      await client.end();
    } catch (e) {
      console.log(`❌ Failed for ${item.label}: ${e.message}`);
    }
  }
}

test();
