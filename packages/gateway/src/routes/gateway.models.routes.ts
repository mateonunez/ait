import { type ModelMetadata, getModelInfoService } from "@ait/ai-sdk";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

/**
 * Model management routes
 * Provides endpoints for listing available models and their capabilities
 */

export default async function modelsRoutes(fastify: FastifyInstance) {
  const modelInfoService = getModelInfoService();

  /**
   * GET /models
   * List all available models with their capabilities
   */
  fastify.get("/", async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const models = modelInfoService.listModels();

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
      const model = modelInfoService.getModelInfo(id);

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

  /**
   * POST /models/register
   * Register a new model or update existing model information
   */
  fastify.post("/register", async (request: FastifyRequest<{ Body: ModelMetadata }>, reply: FastifyReply) => {
    try {
      const modelData = request.body;

      // Validate required fields
      if (!modelData.id || !modelData.name || !modelData.provider) {
        return reply.status(400).send({
          error: "Invalid model data",
          message: "Model id, name, and provider are required",
        });
      }

      modelInfoService.registerModel(modelData);

      return reply.status(200).send({
        success: true,
        message: `Model "${modelData.name}" registered successfully`,
        model: modelData,
      });
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      fastify.log.error({ err: error, route: "/models/register" }, "Failed to register model.");
      return reply.status(500).send({
        error: "Failed to register model",
        message: errMsg,
      });
    }
  });
}
