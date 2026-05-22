const { Client } = require('pg');

async function testConnection(connectionString, label) {
  console.log(`\n--- Testing ${label} ---`);
  const client = new Client({
    connectionString: connectionString,
    ssl: {
      rejectUnauthorized: false
    },
    connectionTimeoutMillis: 5000
  });

  try {
    await client.connect();
    console.log(`✅ ${label}: CONNECTED successfully!`);
    const res = await client.query("SELECT NOW()");
    console.log(`Query result:`, res.rows[0]);
    await client.end();
    return true;
  } catch (err) {
    console.error(`❌ ${label}: ERROR:`, err.message);
    return false;
  }
}

async function run() {
  const variants = [
    {
      url: "postgresql://postgres:REgk1n151n55o8Kh@aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres",
      label: "postgres @ port 5432"
    },
    {
      url: "postgresql://postgres:REgk1n151n55o8Kh@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres",
      label: "postgres @ port 6543"
    },
    {
      url: "postgresql://postgres.gbkdpkjywtxuihglqial:REgk1n151n55o8Kh@aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres",
      label: "postgres.gbkdpkjywtxuihglqial @ port 5432"
    },
    {
      url: "postgresql://postgres.gbkdpkjywtxuihglqial:REgk1n151n55o8Kh@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres",
      label: "postgres.gbkdpkjywtxuihglqial @ port 6543"
    }
  ];

  for (const variant of variants) {
    await testConnection(variant.url, variant.label);
  }
}

run();
