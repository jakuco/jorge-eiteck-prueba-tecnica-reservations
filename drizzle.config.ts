import 'dotenv/config';
import type { Config } from 'drizzle-kit';

export default {
  schema: './src/data/schema/index.ts',
  out: './src/data/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
} satisfies Config;