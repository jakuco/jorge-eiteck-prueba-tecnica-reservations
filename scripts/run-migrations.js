/* eslint-disable no-console */
const path = require('path');
const postgres = require('postgres');
const { drizzle } = require('drizzle-orm/postgres-js');
const { migrate } = require('drizzle-orm/postgres-js/migrator');

// Clave de advisory lock compartida con el seed para serializar el setup de DB
// entre arranques concurrentes (varias réplicas).
const DB_SETUP_LOCK_KEY = 727001;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForDb(client, attempts = 10, delayMs = 2000) {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      await client`SELECT 1`;
      return;
    } catch (err) {
      if (attempt === attempts) throw err;
      console.log(
        `[migrate] DB no disponible (intento ${attempt}/${attempts}); reintento en ${delayMs}ms...`,
      );
      await sleep(delayMs);
    }
  }
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL no está definida');
    process.exit(1);
  }
  const client = postgres(url, { max: 1 });
  try {
    await waitForDb(client);
    // Serializa la migración entre instancias que arrancan a la vez.
    await client`SELECT pg_advisory_lock(${DB_SETUP_LOCK_KEY})`;
    try {
      const db = drizzle(client);
      const migrationsFolder = path.join(__dirname, '..', 'src', 'data', 'migrations');
      await migrate(db, { migrationsFolder });
      console.log('[migrate] Migraciones aplicadas');
    } finally {
      await client`SELECT pg_advisory_unlock(${DB_SETUP_LOCK_KEY})`;
    }
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('[migrate] Error:', err);
  process.exit(1);
});
