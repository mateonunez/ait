import postgres from "postgres";
import dotenv from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import * as drizzleOrm from "drizzle-orm";

dotenv.config();

const postgresUrl = process.env.POSTGRES_URL;

if (!postgresUrl) {
  throw new Error("❌ POSTGRES_URL is not set in the environment");
}

const queryClient = postgres(postgresUrl, {
  max: 5,
  idle_timeout: 0,
  ssl: false,
});

export const db = drizzle(queryClient, {
  logger: true,
});

export const orm = drizzleOrm;

export async function dbClose() {
  await queryClient.end({ timeout: 5 });
  console.log("Database connection closed");
}
