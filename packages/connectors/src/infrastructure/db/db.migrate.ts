import dotenv from "dotenv";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { migrationsPath } from "../../../drizzle.config";
import { db, dbClose } from "./db.client";

dotenv.config();

async function runMigration() {
  try {
    console.log("⏳ Running migrations...");
    const start = Date.now();

    await migrate(db, { migrationsFolder: migrationsPath });

    const end = Date.now();
    console.log("✅ Migrations completed in", end - start, "ms");

    await dbClose();
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

runMigration();
