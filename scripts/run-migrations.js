/* eslint-disable no-console */
const path = require('path');
const postgres = require('postgres');
const { drizzle } = require('drizzle-orm/postgres-js');
const { migrate } = require('drizzle-orm/postgres-js/migrator');

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL no está definida');
    process.exit(1);
  }
  const client = postgres(url, { max: 1 });
  try {
    const db = drizzle(client);
    const migrationsFolder = path.join(__dirname, '..', 'src', 'data', 'migrations');
    await migrate(db, { migrationsFolder });
    console.log('[migrate] Migraciones aplicadas');
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('[migrate] Error:', err);
  process.exit(1);
});