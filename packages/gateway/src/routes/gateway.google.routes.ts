import { type ConnectorGoogleService, clearOAuthData, connectorServiceFactory } from "@ait/connectors";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

declare module "fastify" {
  interface FastifyInstance {
    googleService: ConnectorGoogleService;
  }
}

interface AuthCallbackQuery {
  code: string;
}

interface PaginationQuery {
  page?: string;
  limit?: string;
}

const connectorType = "google";

export default async function googleRoutes(fastify: FastifyInstance) {
  if (!fastify.googleService) {
    fastify.decorate("googleService", connectorServiceFactory.getService<ConnectorGoogleService>(connectorType));
  }

  const googleService = fastify.googleService;

  // OAuth initiation
  fastify.get("/auth", async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const params = new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
        response_type: "code",
        scope: "https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/youtube.readonly",
        access_type: "online",
        prompt: "consent",
      });

      const authUrl = `${process.env.GOOGLE_AUTH_URL || "https://accounts.google.com/o/oauth2/v2/auth"}?${params}`;
      reply.redirect(authUrl);
    } catch (err: any) {
      fastify.log.error({ err, route: "/auth" }, "Failed to initiate Google authentication.");
      reply.status(500).send({ error: "Failed to initiate Google authentication." });
    }
  });

  // OAuth callback
  fastify.get(
    "/auth/callback",
    async (request: FastifyRequest<{ Querystring: AuthCallbackQuery }>, reply: FastifyReply) => {
      const { code } = request.query;

      if (!code) {
        fastify.log.error({ route: "/auth/callback" }, "Missing authorization code.");
        return reply.status(400).send({ error: "Missing authorization code." });
      }

      try {
        await googleService.connector.connect(code);

        // Data fetching is now handled separately via the /refresh endpoint or background jobs
        // to avoid timeout issues during the auth callback.

        reply.send({
          success: true,
          message: "Authentication successful. You can close this window.",
        });
      } catch (err: any) {
        fastify.log.error({ err, route: "/auth/callback" }, "Authentication failed.");
        reply.status(500).send({ error: "Authentication failed." });
      }
    },
  );

  fastify.post("/auth/disconnect", async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      await clearOAuthData(connectorType);
      reply.send({ success: true, message: "Google disconnected successfully." });
    } catch (err: unknown) {
      fastify.log.error({ err, route: "/auth/disconnect" }, "Failed to disconnect Google.");
      reply.status(500).send({ error: "Failed to disconnect Google." });
    }
  });

  // Fetch events from API
  fastify.get("/events", async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const events = await googleService.fetchEvents();
      reply.send(events);
    } catch (err: any) {
      fastify.log.error({ err, route: "/events" }, "Failed to fetch events.");
      reply.status(500).send({ error: "Failed to fetch events." });
    }
  });

  // Fetch calendars from API
  fastify.get("/calendars", async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const calendars = await googleService.fetchCalendars();
      reply.send(calendars);
    } catch (err: any) {
      fastify.log.error({ err, route: "/calendars" }, "Failed to fetch calendars.");
      reply.status(500).send({ error: "Failed to fetch calendars." });
    }
  });

  // Fetch subscriptions from API
  fastify.get("/subscriptions", async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const subscriptions = await googleService.fetchSubscriptions();
      reply.send(subscriptions);
    } catch (err: any) {
      fastify.log.error({ err, route: "/subscriptions" }, "Failed to fetch subscriptions.");
      reply.status(500).send({ error: "Failed to fetch subscriptions." });
    }
  });

  // Paginated data routes - fetch from database
  fastify.get(
    "/data/events",
    async (request: FastifyRequest<{ Querystring: PaginationQuery }>, reply: FastifyReply) => {
      try {
        const page = Number.parseInt(request.query.page || "1", 10);
        const limit = Number.parseInt(request.query.limit || "50", 10);

        const result = await googleService.getEventsPaginated({ page, limit });
        reply.send(result);
      } catch (err: unknown) {
        fastify.log.error({ err, route: "/data/events" }, "Failed to fetch events from DB.");
        reply.status(500).send({ error: "Failed to fetch events from database." });
      }
    },
  );

  fastify.get(
    "/data/calendars",
    async (request: FastifyRequest<{ Querystring: PaginationQuery }>, reply: FastifyReply) => {
      try {
        const page = Number.parseInt(request.query.page || "1", 10);
        const limit = Number.parseInt(request.query.limit || "50", 10);

        const result = await googleService.getCalendarsPaginated({ page, limit });
        reply.send(result);
      } catch (err: unknown) {
        fastify.log.error({ err, route: "/data/calendars" }, "Failed to fetch calendars from DB.");
        reply.status(500).send({ error: "Failed to fetch calendars from database." });
      }
    },
  );

  fastify.get(
    "/data/subscriptions",
    async (request: FastifyRequest<{ Querystring: PaginationQuery }>, reply: FastifyReply) => {
      try {
        const page = Number.parseInt(request.query.page || "1", 10);
        const limit = Number.parseInt(request.query.limit || "50", 10);

        const result = await googleService.getSubscriptionsPaginated({ page, limit });
        reply.send(result);
      } catch (err: unknown) {
        fastify.log.error({ err, route: "/data/subscriptions" }, "Failed to fetch subscriptions from DB.");
        reply.status(500).send({ error: "Failed to fetch subscriptions from database." });
      }
    },
  );

  // Refresh endpoint with optional entity filter
  // Usage: POST /refresh?entities=events,calendars or POST /refresh (all entities)
  fastify.post(
    "/refresh",
    async (request: FastifyRequest<{ Querystring: { entities?: string } }>, reply: FastifyReply) => {
      try {
        const { entities: entitiesParam } = request.query;
        const entitiesToRefresh = entitiesParam
          ? entitiesParam.split(",").map((e) => e.trim().toLowerCase())
          : ["events", "calendars", "subscriptions"];

        const counts: Record<string, number> = {};

        if (entitiesToRefresh.includes("events")) {
          const events = await googleService.fetchEvents();
          await googleService.connector.store.save(events);
          counts.events = events.length;
        }

        if (entitiesToRefresh.includes("calendars")) {
          const calendars = await googleService.fetchCalendars();
          await googleService.connector.store.save(calendars);
          counts.calendars = calendars.length;
        }

        if (entitiesToRefresh.includes("subscriptions")) {
          const subscriptions = await googleService.fetchSubscriptions();
          await googleService.connector.store.save(subscriptions);
          counts.subscriptions = subscriptions.length;
        }

        reply.send({
          success: true,
          message: "Google data refreshed successfully",
          counts,
        });
      } catch (err: unknown) {
        fastify.log.error({ err, route: "/refresh" }, "Failed to refresh Google data.");
        reply.status(500).send({ error: "Failed to refresh Google data." });
      }
    },
  );
}
