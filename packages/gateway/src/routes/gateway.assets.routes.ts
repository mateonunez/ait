import { storageService } from "@ait/storage";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

export async function assetsRoutes(fastify: FastifyInstance) {
  // Serve assets from MinIO storage
  // Route: GET /assets/:bucket/:key
  fastify.get(
    "/:bucket/*",
    async (request: FastifyRequest<{ Params: { bucket: string; "*": string } }>, reply: FastifyReply) => {
      try {
        const { bucket } = request.params;
        const key = request.params["*"];

        if (!bucket || !key) {
          return reply.status(400).send({ error: "Missing bucket or key parameter" });
        }

        const result = await storageService.get(bucket, key);

        if (!result) {
          return reply.status(404).send({ error: "Asset not found" });
        }

        // Set appropriate headers
        if (result.contentType) {
          reply.header("Content-Type", result.contentType);
        }
        reply.header("Cache-Control", "public, max-age=31536000, immutable");

        return reply.send(result.body);
      } catch (err: any) {
        fastify.log.error({ err, route: "/assets" }, "Failed to serve asset.");
        return reply.status(500).send({ error: "Failed to serve asset" });
      }
    },
  );
}
