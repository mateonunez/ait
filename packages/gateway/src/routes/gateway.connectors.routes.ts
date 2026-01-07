import { getOAuthData, isTokenExpiringSoon } from "@ait/connectors";
import { type IntegrationVendor, encrypt, getLogger } from "@ait/core";
import { and, connectorConfigs, eq, getPostgresClient, providers } from "@ait/postgres";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

const logger = getLogger();

export interface ConnectionStatus {
  connected: boolean;
  lastSync?: string;
  expiresAt?: string;
  isExpiringSoon?: boolean;
}

export interface ExtendedConnectionStatus extends ConnectionStatus {
  configId: string;
  vendor: IntegrationVendor;
  granted: boolean;
}

export type ConnectionsStatusMap = Record<string, ExtendedConnectionStatus>;

export interface CreateConfigBody {
  providerId: string;
  name: string;
  config: Record<string, unknown>;
}

export interface ConfigParams {
  id: string;
}

export default async function connectorsRoutes(fastify: FastifyInstance) {
  /**
   * List all available connector providers
   */
  fastify.get("/providers", async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { db } = getPostgresClient();
      const allProviders = await db.select().from(providers).where(eq(providers.isEnabled, true));
      return reply.send(allProviders);
    } catch (err) {
      logger.error("Failed to fetch providers", { err });
      return reply.status(500).send({ error: "Failed to fetch providers" });
    }
  });

  /**
   * List user's connector configurations
   */
  fastify.get("/configs", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = request.headers["x-user-id"] as string;
      if (!userId) {
        return reply.status(401).send({ error: "Unauthorized" });
      }

      const { db } = getPostgresClient();
      const configs = await db.query.connectorConfigs.findMany({
        where: eq(connectorConfigs.userId, userId),
        with: {
          provider: true,
        },
      });

      return reply.send(configs);
    } catch (err) {
      logger.error("Failed to fetch connector configurations", { err });
      return reply.status(500).send({ error: "Failed to fetch connector configurations" });
    }
  });

  /**
   * Create or update a connector configuration
   */
  fastify.post("/configs", async (request: FastifyRequest<{ Body: CreateConfigBody }>, reply: FastifyReply) => {
    try {
      const userId = request.headers["x-user-id"] as string;
      if (!userId) throw new Error("Unauthorized");

      const { providerId, name, config } = request.body;
      const encryptionKey = process.env.AIT_ENCRYPTION_KEY;
      if (!encryptionKey) throw new Error("Encryption key missing");

      const { content, iv } = encrypt(JSON.stringify(config), encryptionKey);

      const { db } = getPostgresClient();
      const [newConfig] = await db
        .insert(connectorConfigs)
        .values({
          userId,
          providerId,
          name,
          encryptedConfig: content,
          iv,
          status: "active",
        })
        .returning();

      return reply.send(newConfig);
    } catch (err: unknown) {
      logger.error("Failed to save connector configuration", { err });
      return reply.status(500).send({
        error: err instanceof Error ? err.message : "Failed to save connector configuration",
      });
    }
  });

  /**
   * Delete a connector configuration
   */
  fastify.delete("/configs/:id", async (request: FastifyRequest<{ Params: ConfigParams }>, reply: FastifyReply) => {
    try {
      const userId = request.headers["x-user-id"] as string;
      const { id } = request.params;

      const { db } = getPostgresClient();
      await db.delete(connectorConfigs).where(and(eq(connectorConfigs.id, id), eq(connectorConfigs.userId, userId)));

      return reply.send({ success: true });
    } catch (err) {
      logger.error("Failed to delete connector configuration", { err });
      return reply.status(500).send({ error: "Failed to delete connector configuration" });
    }
  });

  fastify.get("/status", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = request.headers["x-user-id"] as string;
      if (!userId) return reply.status(401).send({ error: "Unauthorized" });

      const statusMap: ConnectionsStatusMap = {};

      const { db } = getPostgresClient();
      const configs = await db.query.connectorConfigs.findMany({
        where: eq(connectorConfigs.userId, userId),
        with: {
          provider: true,
        },
      });

      for (const config of configs) {
        const vendor = config.provider.slug as IntegrationVendor;
        const token = await getOAuthData(vendor, userId);
        const granted = config.isEnabled && config.provider.isEnabled;

        if (token) {
          let expiresAt: string | undefined;
          let isExpiringSoon = false;

          if (token.expiresIn && token.updatedAt) {
            const expiresInSeconds = Number.parseInt(token.expiresIn, 10);
            if (!Number.isNaN(expiresInSeconds)) {
              const expirationDate = new Date(token.updatedAt.getTime() + expiresInSeconds * 1000);
              expiresAt = expirationDate.toISOString();
              isExpiringSoon = isTokenExpiringSoon(expirationDate, token.updatedAt);
            }
          }

          statusMap[config.id] = {
            connected: true,
            lastSync: token.updatedAt?.toISOString(),
            expiresAt,
            isExpiringSoon,
            configId: config.id,
            vendor,
            granted,
          };
        } else {
          statusMap[config.id] = {
            connected: false,
            configId: config.id,
            vendor,
            granted,
          };
        }
      }

      reply.send(statusMap);
    } catch (err: unknown) {
      fastify.log.error({ err, route: "/status" }, "Failed to fetch connection status.");
      reply.status(500).send({ error: "Failed to fetch connection status." });
    }
  });
}
