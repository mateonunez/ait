import postgres from 'postgres';
import dotenv from 'dotenv';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrationsPath } from './../../../drizzle.config';

dotenv.config();

async function runMigration() {
  const postgresUrl = process.env.POSTGRES_URL;
  if (!postgresUrl) {
    throw new Error('POSTGRES_URL is not defined');
  }

  const connection = postgres(postgresUrl, { max: 1 });
  const db = drizzle(connection);

  console.log('⏳ Running migrations...');

  const start = Date.now();
  // @ts-ignore - The migrate function is not typed
  await migrate(db, { migrationsFolder: migrationsPath });
  const end = Date.now();

  console.log('✅ Migrations completed in', end - start, 'ms');
  process.exit(0);
}

runMigration().catch((error) => {
  console.error('❌ Migration failed:', error);
  process.exit(1);
});
