import { SUPPORTED_VENDORS, getOAuthData, isTokenExpiringSoon } from "@ait/connectors";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

export interface ConnectionStatus {
  connected: boolean;
  lastSync?: string;
  expiresAt?: string;
  isExpiringSoon?: boolean;
}

export type ConnectionsStatusMap = Record<string, ConnectionStatus>;

export default async function connectorsRoutes(fastify: FastifyInstance) {
  fastify.get("/status", async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const statusMap: ConnectionsStatusMap = {};

      for (const vendor of SUPPORTED_VENDORS) {
        const token = await getOAuthData(vendor);

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

          statusMap[vendor] = {
            connected: true,
            lastSync: token.updatedAt?.toISOString(),
            expiresAt,
            isExpiringSoon,
          };
        } else {
          statusMap[vendor] = {
            connected: false,
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


