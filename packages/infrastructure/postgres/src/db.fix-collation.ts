import dotenv from "dotenv";
import { getPostgresClient, closePostgresConnection } from "./postgres.client";

dotenv.config();

if (process.env.NODE_ENV === "test") {
  dotenv.config({ path: ".env.test", override: true });
}

async function fixCollationVersion() {
  try {
    console.log("🔧 Fixing database collation version...");
    const start = Date.now();

    const { queryClient } = getPostgresClient();

    const dbUrl = process.env.POSTGRES_URL;
    const dbName = dbUrl?.split("/").pop()?.split("?")[0] || "ait";

    console.log(`📊 Refreshing collation version for database: ${dbName}`);

    const query = `ALTER DATABASE ${dbName} REFRESH COLLATION VERSION`;
    await queryClient.unsafe(query);

    const end = Date.now();
    console.log(`✅ Collation version refreshed successfully in ${end - start}ms`);

    await closePostgresConnection();
    process.exit(0);
  } catch (error) {
    console.error("❌ Failed to fix collation version:", error);
    process.exit(1);
  }
}

fixCollationVersion();
