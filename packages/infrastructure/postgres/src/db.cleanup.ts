import dotenv from "dotenv";
import postgres from "postgres";

dotenv.config();

const databaseUrl = process.env.DATABASE_URL || "postgresql://root:toor@localhost:5432/ait";

async function run() {
  console.log("🔗 Connecting to database...");
  const sql = postgres(databaseUrl);

  try {
    console.log("🧹 Truncating oauth_tokens table...");
    await sql`TRUNCATE TABLE oauth_tokens CASCADE;`;
    console.log("✅ Table truncated successfully.");
  } catch (err) {
    console.error("❌ Failed to truncate table:", err);
  } finally {
    await sql.end();
  }
}

run();
