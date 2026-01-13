import { type ConnectorGoogleService, clearOAuthData, connectorServiceFactory } from "@ait/connectors";
import { getLogger } from "@ait/core";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

const logger = getLogger();

interface AuthCallbackQuery {
  code: string;
}

interface PaginationQuery {
  page?: string;
  limit?: string;
}

const connectorType = "google";

const GOOGLE_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/youtube.readonly",
  "https://www.googleapis.com/auth/contacts.readonly",
  "https://www.googleapis.com/auth/photoslibrary",
  "https://www.googleapis.com/auth/photoslibrary.readonly",
  "https://www.googleapis.com/auth/photoslibrary.readonly.appcreateddata",
  "https://www.googleapis.com/auth/photoslibrary.sharing",
  "https://www.googleapis.com/auth/photoslibrary.appendonly",
  "https://www.googleapis.com/auth/photoslibrary.edit.appcreateddata",
  "https://www.googleapis.com/auth/photospicker.mediaitems.readonly",
];

export default async function googleRoutes(fastify: FastifyInstance) {
  const getService = async (request: FastifyRequest, configId?: string): Promise<ConnectorGoogleService> => {
    let userId = (request.headers["x-user-id"] || (request.query as { userId?: string }).userId) as string | undefined;

    // Support extracting userId from OAuth state if it's encoded there
    const state = (request.query as { state?: string }).state;
    if (!userId && state && typeof state === "string" && state.includes(":")) {
      userId = state.split(":")[1];
    }

    const currentUserId = userId || "anonymous";

    if (configId) {
      return await connectorServiceFactory.getServiceByConfig<ConnectorGoogleService>(configId, currentUserId);
    }

    // Attempt to find the first active Google service for the user
    const service = await connectorServiceFactory.getActiveServiceByVendor<ConnectorGoogleService>(
      connectorType,
      currentUserId,
    );

    if (service) return service;

    // Fallback/Legacy
    return connectorServiceFactory.getService<ConnectorGoogleService>(connectorType);
  };

  // OAuth initiation
  fastify.get("/auth", async (request: FastifyRequest<{ Querystring: { configId: string } }>, reply: FastifyReply) => {
    try {
      const { configId } = request.query;
      if (!configId) return reply.status(400).send({ error: "Missing configId" });

      const service = await getService(request, configId);
      const userId = (request.headers["x-user-id"] || (request.query as { userId?: string }).userId) as string;
      const config = service.connector.authenticator.getOAuthConfig();

      const params = new URLSearchParams({
        client_id: config.clientId,
        redirect_uri: config.redirectUri!,
        response_type: "code",
        scope: GOOGLE_SCOPES.join(" "),
        access_type: "offline",
        prompt: "consent",
        state: `${configId}:${userId}`,
      });

      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
      fastify.log.info({ authUrl, route: "/auth" }, "Generated Google Auth URL");
      reply.redirect(authUrl);
    } catch (err: unknown) {
      fastify.log.error({ err, route: "/auth" }, "Failed to initiate Google authentication.");
      reply.status(500).send({ error: "Failed to initiate Google authentication." });
    }
  });

  // OAuth callback
  fastify.get(
    "/auth/callback",
    async (request: FastifyRequest<{ Querystring: AuthCallbackQuery & { state?: string } }>, reply: FastifyReply) => {
      const { code, state } = request.query;
      const [configId] = (state || "").split(":");

      if (!code) {
        fastify.log.error({ route: "/auth/callback" }, "Missing authorization code.");
        return reply.status(400).send({ error: "Missing authorization code." });
      }

      try {
        const service = await getService(request, configId);
        await service.connector.connect(code);

        reply.send({
          success: true,
          message: "Authentication successful. You can close this window.",
        });
      } catch (err: unknown) {
        fastify.log.error({ err, route: "/auth/callback" }, "Authentication failed.");
        reply.status(500).send({ error: "Authentication failed." });
      }
    },
  );

  fastify.post(
    "/auth/disconnect",
    async (request: FastifyRequest<{ Querystring: { configId?: string } }>, reply: FastifyReply) => {
      try {
        const userId = request.headers["x-user-id"] as string;
        await clearOAuthData(connectorType, userId);
        reply.send({ success: true, message: "Google disconnected successfully." });
      } catch (err: unknown) {
        fastify.log.error({ err, route: "/auth/disconnect" }, "Failed to disconnect Google.");
        reply.status(500).send({ error: "Failed to disconnect Google." });
      }
    },
  );

  // Fetch events from API
  fastify.get(
    "/events",
    async (request: FastifyRequest<{ Querystring: { configId?: string } }>, reply: FastifyReply) => {
      try {
        const { configId } = request.query;
        const service = await getService(request, configId);
        const events = await service.fetchEvents();
        reply.send(events);
      } catch (err: unknown) {
        fastify.log.error({ err, route: "/events" }, "Failed to fetch events.");
        reply.status(500).send({ error: "Failed to fetch events." });
      }
    },
  );

  // Fetch calendars from API
  fastify.get(
    "/calendars",
    async (request: FastifyRequest<{ Querystring: { configId?: string } }>, reply: FastifyReply) => {
      try {
        const { configId } = request.query;
        const service = await getService(request, configId);
        const calendars = await service.fetchCalendars();
        reply.send(calendars);
      } catch (err: unknown) {
        fastify.log.error({ err, route: "/calendars" }, "Failed to fetch calendars.");
        reply.status(500).send({ error: "Failed to fetch calendars." });
      }
    },
  );

  // Fetch subscriptions from API
  fastify.get(
    "/subscriptions",
    async (request: FastifyRequest<{ Querystring: { configId?: string } }>, reply: FastifyReply) => {
      try {
        const { configId } = request.query;
        const service = await getService(request, configId);
        const subscriptions = await service.fetchSubscriptions();
        reply.send(subscriptions);
      } catch (err: unknown) {
        fastify.log.error({ err, route: "/subscriptions" }, "Failed to fetch subscriptions.");
        reply.status(500).send({ error: "Failed to fetch subscriptions." });
      }
    },
  );

  // Fetch contacts from API
  fastify.get(
    "/contacts",
    async (request: FastifyRequest<{ Querystring: { configId?: string } }>, reply: FastifyReply) => {
      try {
        const { configId } = request.query;
        const service = await getService(request, configId);
        const contacts = await service.fetchContacts();
        reply.send(contacts);
      } catch (err: unknown) {
        fastify.log.error({ err, route: "/contacts" }, "Failed to fetch contacts.");
        reply.status(500).send({ error: "Failed to fetch contacts." });
      }
    },
  );

  // Paginated data routes - fetch from database
  fastify.get(
    "/data/events",
    async (request: FastifyRequest<{ Querystring: PaginationQuery & { configId?: string } }>, reply: FastifyReply) => {
      try {
        const { configId } = request.query;
        const service = await getService(request, configId);
        const page = Number.parseInt(request.query.page || "1", 10);
        const limit = Number.parseInt(request.query.limit || "50", 10);

        const result = await service.getEventsPaginated({ page, limit });
        reply.send(result);
      } catch (err: unknown) {
        fastify.log.error({ err, route: "/data/events" }, "Failed to fetch events from DB.");
        reply.status(500).send({ error: "Failed to fetch events from database." });
      }
    },
  );

  fastify.get(
    "/data/calendars",
    async (request: FastifyRequest<{ Querystring: PaginationQuery & { configId?: string } }>, reply: FastifyReply) => {
      try {
        const { configId } = request.query;
        const service = await getService(request, configId);
        const page = Number.parseInt(request.query.page || "1", 10);
        const limit = Number.parseInt(request.query.limit || "50", 10);

        const result = await service.getCalendarsPaginated({ page, limit });
        reply.send(result);
      } catch (err: unknown) {
        fastify.log.error({ err, route: "/data/calendars" }, "Failed to fetch calendars from DB.");
        reply.status(500).send({ error: "Failed to fetch calendars from database." });
      }
    },
  );

  fastify.get(
    "/data/subscriptions",
    async (request: FastifyRequest<{ Querystring: PaginationQuery & { configId?: string } }>, reply: FastifyReply) => {
      try {
        const { configId } = request.query;
        const service = await getService(request, configId);
        const page = Number.parseInt(request.query.page || "1", 10);
        const limit = Number.parseInt(request.query.limit || "50", 10);

        const result = await service.getSubscriptionsPaginated({ page, limit });
        reply.send(result);
      } catch (err: unknown) {
        fastify.log.error({ err, route: "/data/subscriptions" }, "Failed to fetch subscriptions from DB.");
        reply.status(500).send({ error: "Failed to fetch subscriptions from database." });
      }
    },
  );

  fastify.get(
    "/data/contacts",
    async (request: FastifyRequest<{ Querystring: PaginationQuery & { configId?: string } }>, reply: FastifyReply) => {
      try {
        const { configId } = request.query;
        const service = await getService(request, configId);
        const page = Number.parseInt(request.query.page || "1", 10);
        const limit = Number.parseInt(request.query.limit || "50", 10);

        const result = await service.getContactsPaginated({ page, limit });
        reply.send(result);
      } catch (err: unknown) {
        fastify.log.error({ err, route: "/data/contacts" }, "Failed to fetch contacts from DB.");
        reply.status(500).send({ error: "Failed to fetch contacts from database." });
      }
    },
  );

  fastify.get(
    "/data/photos",
    async (request: FastifyRequest<{ Querystring: PaginationQuery & { configId?: string } }>, reply: FastifyReply) => {
      try {
        const { configId } = request.query;
        const service = await getService(request, configId);
        const page = Number.parseInt(request.query.page || "1", 10);
        const limit = Number.parseInt(request.query.limit || "50", 10);

        const result = await service.getPhotosPaginated({ page, limit });
        reply.send(result);
      } catch (err: unknown) {
        fastify.log.error({ err, route: "/data/photos" }, "Failed to fetch photos from DB.");
        reply.status(500).send({ error: "Failed to fetch photos from database." });
      }
    },
  );

  // Refresh endpoint with optional entity filter
  fastify.post(
    "/refresh",
    async (request: FastifyRequest<{ Querystring: { entities?: string; configId?: string } }>, reply: FastifyReply) => {
      try {
        const { entities: entitiesParam, configId } = request.query;
        const service = await getService(request, configId);

        const entitiesToRefresh = entitiesParam
          ? entitiesParam.split(",").map((e) => e.trim().toLowerCase())
          : ["events", "calendars", "subscriptions", "contacts", "photos"];

        const counts: Record<string, number> = {};

        if (entitiesToRefresh.includes("events")) {
          const events = await service.fetchEvents();
          await service.connector.store.save(events);
          counts.events = events.length;
        }

        if (entitiesToRefresh.includes("calendars")) {
          const calendars = await service.fetchCalendars();
          await service.connector.store.save(calendars);
          counts.calendars = calendars.length;
        }

        if (entitiesToRefresh.includes("subscriptions")) {
          const subscriptions = await service.fetchSubscriptions();
          await service.connector.store.save(subscriptions);
          counts.subscriptions = subscriptions.length;
        }

        if (entitiesToRefresh.includes("contacts")) {
          const contacts = await service.fetchContacts();
          await service.connector.store.save(contacts);
          counts.contacts = contacts.length;
        }

        if (entitiesToRefresh.includes("photos")) {
          const photos = await service.fetchPhotos();
          await service.connector.store.save(photos);
          counts.photos = photos.length;
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

  // Picker API Routes
  fastify.post(
    "/photos/picker/session",
    async (request: FastifyRequest<{ Querystring: { configId?: string } }>, reply: FastifyReply) => {
      try {
        const { configId } = request.query;
        const service = await getService(request, configId);
        const session = await service.createPickerSession();
        reply.send(session);
      } catch (err: unknown) {
        fastify.log.error({ err, route: "/photos/picker/session" }, "Failed to create picker session.");
        reply.status(500).send({ error: "Failed to create picker session." });
      }
    },
  );

  fastify.get(
    "/photos/picker/session/:id",
    async (
      request: FastifyRequest<{ Params: { id: string }; Querystring: { configId?: string } }>,
      reply: FastifyReply,
    ) => {
      try {
        const { id } = request.params;
        const { configId } = request.query;
        const service = await getService(request, configId);
        const session = await service.getPickerSession(id);
        reply.send(session);
      } catch (err: unknown) {
        fastify.log.error({ err, route: "/photos/picker/session/:id" }, "Failed to get picker session.");
        reply.status(500).send({ error: "Failed to get picker session." });
      }
    },
  );

  fastify.post(
    "/photos/picker/import/:id",
    async (
      request: FastifyRequest<{ Params: { id: string }; Querystring: { configId?: string } }>,
      reply: FastifyReply,
    ) => {
      try {
        const { id } = request.params;
        const { configId } = request.query;
        const service = await getService(request, configId);
        const mediaItems = await service.listPickerMediaItems(id);

        if (mediaItems.length > 0) {
          await service.importPickerMediaItems(id);
        }

        reply.send({ success: true, count: mediaItems.length });
      } catch (err: unknown) {
        fastify.log.error({ err, route: "/photos/picker/import/:id" }, "Failed to import picker media items.");
        reply.status(500).send({ error: "Failed to import picker media items." });
      }
    },
  );
}
