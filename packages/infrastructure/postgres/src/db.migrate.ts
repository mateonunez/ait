import dotenv from "dotenv";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { migrationsPath } from "./drizzle.config";
import { getPostgresClient, closePostgresConnection } from "./postgres.client";

dotenv.config();

if (process.env.NODE_ENV === "test") {
  dotenv.config({ path: ".env.test", override: true });
}

async function waitForDatabase(maxRetries = 10, delayMs = 1000): Promise<void> {
  console.log("⏳ Waiting for database to be ready...");

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const { queryClient } = getPostgresClient();
      await queryClient`SELECT 1`;
      console.log(`✅ Database is ready after ${attempt} attempt(s)`);
      return;
    } catch (error) {
      if (attempt === maxRetries) {
        console.error(`❌ Database not ready after ${maxRetries} attempts`);
        throw error;
      }
      console.log(`⏳ Attempt ${attempt}/${maxRetries}: Database not ready yet, retrying in ${delayMs}ms...`);
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        await closePostgresConnection();
      }
    }
  }
}

async function runMigration() {
  try {
    console.log("⏳ Running migrations...");
    console.log(`📊 Environment: NODE_ENV=${process.env.NODE_ENV}`);
    console.log(`🔗 Database URL: ${process.env.POSTGRES_URL}`);
    const start = Date.now();

    await waitForDatabase();

    const { db } = getPostgresClient();

    console.log("📋 Note: Collation version warnings and 'already exists' notices are normal and can be ignored.");
    console.log("💡 If you see collation version mismatch warnings, run: pnpm db:fix-collation");

    await migrate(db, { migrationsFolder: migrationsPath });

    const end = Date.now();
    console.log("✅ Migrations completed in", end - start, "ms");

    await closePostgresConnection();
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    await closePostgresConnection();
    process.exit(1);
  }
}

runMigration();
