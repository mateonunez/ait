import { getAllModels, getModelMetadata } from "@ait/ai-sdk";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

/**
 * Model management routes
 * Provides endpoints for listing available models and their capabilities
 */

export default async function modelsRoutes(fastify: FastifyInstance) {
  /**
   * GET /models
   * List all available models with their capabilities
   */
  fastify.get("/", async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const models = getAllModels();

      return reply.status(200).send({
        models,
        count: models.length,
      });
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      fastify.log.error({ err: error, route: "/models" }, "Failed to list models.");
      return reply.status(500).send({
        error: "Failed to list models",
        message: errMsg,
      });
    }
  });

  /**
   * GET /models/:id
   * Get information about a specific model
   */
  fastify.get("/:id", async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.params;
      const model = getModelMetadata(id);

      if (!model) {
        return reply.status(404).send({
          error: "Model not found",
          message: `Model with id "${id}" not found`,
        });
      }

      return reply.status(200).send({ model });
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      fastify.log.error({ err: error, route: "/models/:id" }, "Failed to get model info.");
      return reply.status(500).send({
        error: "Failed to get model info",
        message: errMsg,
      });
    }
  });
}
