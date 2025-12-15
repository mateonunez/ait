import { Queue } from "bullmq";
import { getRedisClient } from "@ait/redis";
import { getLogger } from "@ait/core";
import dotenv from "dotenv";
import * as readline from "node:readline";

const logger = getLogger();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function askQuestion(query: string): Promise<string> {
  return new Promise((resolve) => rl.question(query, resolve));
}

async function clean() {
  dotenv.config();

  logger.warn("⚠️  DANGER ZONE ⚠️");
  logger.warn("This script will:");
  logger.warn("1. OBLITERATE the 'etl-scheduler' BullMQ queue (all pending/active jobs).");
  logger.warn("2. DELETE ALL 'sync-state:*' keys from Redis (resetting sync state for ALL connectors).");

  const answer = await askQuestion("Are you sure you want to proceed? (yes/no): ");

  if (answer.toLowerCase() !== "yes") {
    logger.info("❌ Operation cancelled by user.");
    rl.close();
    return;
  }

  logger.info("🧹 Starting cleanup process...");

  // 1. Clean BullMQ (Redis)
  const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
  const queueName = "etl-scheduler";

  logger.info(`🔥 Obliterating BullMQ queue: ${queueName} at ${redisUrl}`);
  const queue = new Queue(queueName, { connection: { url: redisUrl } });

  try {
    await queue.obliterate({ force: true });
    logger.info("✅ BullMQ queue obliterated.");
  } catch (error) {
    logger.error("❌ Failed to obliterate queue:", { error });
  } finally {
    await queue.close();
  }

  // 2. Clean Redis Sync State
  // Pattern: sync-state:{connector}:{entityType}

  logger.info("🔥 Resetting Redis Sync State for ALL collections...");
  // Use the standard Redis client util from the project
  const redis = getRedisClient();

  try {
    const keys = await redis.keys("sync-state:*");
    if (keys.length > 0) {
      await redis.del(...keys);
      logger.info(`✅ Deleted ${keys.length} sync state keys from Redis: ${keys.join(", ")}`);
    } else {
      logger.info("ℹ️ No sync state keys found in Redis.");
    }
  } catch (error) {
    logger.error("Failed to clean Redis sync keys:", { error });
  }

  rl.close();
}

async function main() {
  try {
    await clean();
    process.exit(0);
  } catch (e: any) {
    console.error(e);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
