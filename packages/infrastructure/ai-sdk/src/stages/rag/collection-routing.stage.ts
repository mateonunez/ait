import { CollectionRouterService } from "../../services/routing/collection-router.service";
import type { IPipelineStage, PipelineContext } from "../../services/rag/pipeline/pipeline.types";
import type { CollectionRoutingInput, CollectionRoutingOutput } from "../../types/stages";

export class CollectionRoutingStage implements IPipelineStage<CollectionRoutingInput, CollectionRoutingOutput> {
  readonly name = "collection-routing";

  private readonly routerService: CollectionRouterService;

  constructor(config?: { temperature?: number; minConfidenceThreshold?: number }) {
    this.routerService = new CollectionRouterService(config);
  }

  async canExecute(input: CollectionRoutingInput): Promise<boolean> {
    return input.shouldUseFastPath !== true;
  }

  async execute(input: CollectionRoutingInput, context: PipelineContext): Promise<CollectionRoutingOutput> {
    const routingResult = await this.routerService.routeCollections(input.query, input.intent, context.traceContext);

    return {
      ...input,
      routingResult,
    };
  }
}
