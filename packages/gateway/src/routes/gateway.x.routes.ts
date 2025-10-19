import { connectorServiceFactory, type ConnectorXService } from "@ait/connectors";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

declare module "fastify" {
  interface FastifyInstance {
    xService: ConnectorXService;
  }
}

interface AuthCallbackQuery {
  code: string;
}

const connectorType = "x";

export default async function xRoutes(fastify: FastifyInstance) {
  if (!fastify.xService) {
    fastify.decorate("xService", connectorServiceFactory.getService<ConnectorXService>(connectorType));
  }

  const xService = fastify.xService;
  const store = xService.connector.store;
  const authenticator = xService.connector.authenticator;

  fastify.get("/auth", async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const authUrl = authenticator.getAuthorizationUrl();
      console.log("authUrl", authUrl);
      reply.redirect(authUrl);
    } catch (err: any) {
      fastify.log.error({ err, route: "/auth" }, "Failed to initiate X authentication.");
      reply.status(500).send({ error: "Failed to initiate X authentication." });
    }
  });

  fastify.get(
    "/auth/callback",
    async (request: FastifyRequest<{ Querystring: AuthCallbackQuery }>, reply: FastifyReply) => {
      const { code } = request.query;

      if (!code) {
        fastify.log.error({ route: "/auth/callback" }, "Missing authorization code.");
        return reply.status(400).send({ error: "Missing authorization code." });
      }

      try {
        await xService.connector.connect(code);
        const tweets = await xService.getTweets();
        await store.save(tweets);

        reply.send({ tweets });
      } catch (err: any) {
        fastify.log.error({ err, route: "/auth/callback" }, "X authentication failed.");
        reply.status(500).send({ error: "X authentication failed." });
      }
    },
  );

  fastify.get("/tweets", async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const tweets = await xService.getTweets();
      reply.send(tweets);
    } catch (err: any) {
      fastify.log.error({ err, route: "/tweets" }, "Failed to fetch X tweets.");
      reply.status(500).send({ error: "Failed to fetch X tweets." });
    }
  });
}
