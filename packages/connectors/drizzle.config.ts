import dotenv from 'dotenv';
import { defineConfig } from 'drizzle-kit';

dotenv.config();

export const databaseSchemaPath = './src/infrastructure/db/schema.ts';
export const migrationsPath = './src/infrastructure/db/migrations';
export const dialect = 'postgresql';

export default defineConfig({
  schema: databaseSchemaPath,
  out: migrationsPath,
  dialect: dialect,
  dbCredentials: {
    url: process.env.POSTGRES_URL!,
  },
});
