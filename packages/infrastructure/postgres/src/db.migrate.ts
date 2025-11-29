import dotenv from "dotenv";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { migrationsPath } from "./drizzle.config";
import { getPostgresClient, closePostgresConnection } from "./postgres.client";
import { getLogger } from "@ait/core";

const logger = getLogger();

dotenv.config();

if (process.env.NODE_ENV === "test") {
  dotenv.config({ path: ".env.test", override: true });
}

async function waitForDatabase(maxRetries = 10, delayMs = 1000): Promise<void> {
  logger.info("⏳ Waiting for database to be ready...");

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const { queryClient } = getPostgresClient();
      await queryClient`SELECT 1`;
      logger.info(`✅ Database is ready after ${attempt} attempt(s)`);
      return;
    } catch (error) {
      if (attempt === maxRetries) {
        logger.error(`❌ Database not ready after ${maxRetries} attempts`);
        throw error;
      }
      logger.info(`⏳ Attempt ${attempt}/${maxRetries}: Database not ready yet, retrying in ${delayMs}ms...`);
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        await closePostgresConnection();
      }
    }
  }
}

async function runMigration() {
  try {
    logger.info("⏳ Running migrations...");
    logger.info(`📊 Environment: NODE_ENV=${process.env.NODE_ENV}`);
    logger.info(`🔗 Database URL: ${process.env.POSTGRES_URL}`);
    const start = Date.now();

    await waitForDatabase();

    const { db } = getPostgresClient();

    logger.info("📋 Note: Collation version warnings and 'already exists' notices are normal and can be ignored.");
    logger.info("💡 If you see collation version mismatch warnings, run: pnpm db:fix-collation");

    await migrate(db, { migrationsFolder: migrationsPath });

    const end = Date.now();
    logger.info("✅ Migrations completed in", { time: `${end - start}ms` });

    await closePostgresConnection();
    process.exit(0);
  } catch (error) {
    logger.error("❌ Migration failed:", { error });
    await closePostgresConnection();
    process.exit(1);
  }
}

runMigration();
