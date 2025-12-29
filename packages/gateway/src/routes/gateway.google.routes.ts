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
        scope: GOOGLE_SCOPES.join(" "),
        access_type: "offline",
        prompt: "consent",
      });

      const authUrl = `${process.env.GOOGLE_AUTH_URL || "https://accounts.google.com/o/oauth2/v2/auth"}?${params}`;
      fastify.log.info({ authUrl, route: "/auth" }, "Generated Google Auth URL");
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

  // Fetch contacts from API
  fastify.get("/contacts", async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const contacts = await googleService.fetchContacts();
      reply.send(contacts);
    } catch (err: any) {
      fastify.log.error({ err, route: "/contacts" }, "Failed to fetch contacts.");
      reply.status(500).send({ error: "Failed to fetch contacts." });
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

  fastify.get(
    "/data/contacts",
    async (request: FastifyRequest<{ Querystring: PaginationQuery }>, reply: FastifyReply) => {
      try {
        const page = Number.parseInt(request.query.page || "1", 10);
        const limit = Number.parseInt(request.query.limit || "50", 10);

        const result = await googleService.getContactsPaginated({ page, limit });
        reply.send(result);
      } catch (err: unknown) {
        fastify.log.error({ err, route: "/data/contacts" }, "Failed to fetch contacts from DB.");
        reply.status(500).send({ error: "Failed to fetch contacts from database." });
      }
    },
  );

  fastify.get(
    "/data/photos",
    async (request: FastifyRequest<{ Querystring: PaginationQuery }>, reply: FastifyReply) => {
      try {
        const page = Number.parseInt(request.query.page || "1", 10);
        const limit = Number.parseInt(request.query.limit || "50", 10);

        const result = await googleService.getPhotosPaginated({ page, limit });
        reply.send(result);
      } catch (err: unknown) {
        fastify.log.error({ err, route: "/data/photos" }, "Failed to fetch photos from DB.");
        reply.status(500).send({ error: "Failed to fetch photos from database." });
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
          : ["events", "calendars", "subscriptions", "contacts", "photos"];

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

        if (entitiesToRefresh.includes("contacts")) {
          const contacts = await googleService.fetchContacts();
          await googleService.connector.store.save(contacts);
          counts.contacts = contacts.length;
        }

        if (entitiesToRefresh.includes("photos")) {
          const photos = await googleService.fetchPhotos();
          await googleService.connector.store.save(photos);
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
  fastify.post("/photos/picker/session", async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const session = await googleService.createPickerSession();
      reply.send(session);
    } catch (err: any) {
      fastify.log.error({ err, route: "/photos/picker/session" }, "Failed to create picker session.");
      reply.status(500).send({ error: "Failed to create picker session." });
    }
  });

  fastify.get(
    "/photos/picker/session/:id",
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const { id } = request.params;
        const session = await googleService.getPickerSession(id);
        reply.send(session);
      } catch (err: any) {
        fastify.log.error({ err, route: "/photos/picker/session/:id" }, "Failed to get picker session.");
        reply.status(500).send({ error: "Failed to get picker session." });
      }
    },
  );

  fastify.post(
    "/photos/picker/import/:id",
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const { id } = request.params;
        const mediaItems = await googleService.listPickerMediaItems(id);

        if (mediaItems.length > 0) {
          await googleService.importPickerMediaItems(id);
        }

        reply.send({ success: true, count: mediaItems.length });
      } catch (err: any) {
        fastify.log.error({ err, route: "/photos/picker/import/:id" }, "Failed to import picker media items.");
        reply.status(500).send({ error: "Failed to import picker media items." });
      }
    },
  );
}
