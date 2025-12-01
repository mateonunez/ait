import { getLogger } from "@ait/core";
import dotenv from "dotenv";
import { closePostgresConnection, getPostgresClient } from "./postgres.client";

const logger = getLogger();

dotenv.config();

if (process.env.NODE_ENV === "test") {
  dotenv.config({ path: ".env.test", override: true });
}

async function fixCollationVersion() {
  try {
    logger.info("🔧 Fixing database collation version...");
    const start = Date.now();

    const { queryClient } = getPostgresClient();

    const dbUrl = process.env.POSTGRES_URL;
    const dbName = dbUrl?.split("/").pop()?.split("?")[0] || "ait";

    logger.info(`📊 Refreshing collation version for database: ${dbName}`);

    const query = `ALTER DATABASE ${dbName} REFRESH COLLATION VERSION`;
    await queryClient.unsafe(query);

    const end = Date.now();
    logger.info(`✅ Collation version refreshed successfully in ${end - start}ms`);

    await closePostgresConnection();
    process.exit(0);
  } catch (error) {
    logger.error("❌ Failed to fix collation version:", { error });
    process.exit(1);
  }
}

fixCollationVersion();
