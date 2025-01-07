import dotenv from "dotenv";
import { defineConfig } from "drizzle-kit";

dotenv.config();

if (process.env.NODE_ENV === "test") {
  dotenv.config({ path: ".env.test", override: true });
}

export const databaseSchemaPath = "./src/schemas";
export const migrationsPath = "./src/migrations";
export const dialect = "postgresql";

export default defineConfig({
  schema: databaseSchemaPath,
  out: migrationsPath,
  dialect: dialect,
  dbCredentials: {
    url: process.env.POSTGRES_URL!,
  },
});
