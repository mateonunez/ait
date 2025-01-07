import dotenv from "dotenv";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { migrationsPath } from "./drizzle.config";
import { getPostgresClient, closePostgresConnection } from "./postgres.client";

dotenv.config();

if (process.env.NODE_ENV === "test") {
  dotenv.config({ path: ".env.test" });
}

async function runMigration() {
  try {
    console.log("⏳ Running migrations...");
    const start = Date.now();
    const { db } = getPostgresClient();
    await migrate(db, { migrationsFolder: migrationsPath });

    const end = Date.now();
    console.log("✅ Migrations completed in", end - start, "ms");

    await closePostgresConnection();
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

runMigration();
