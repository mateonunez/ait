import type { IPipelineStage, PipelineContext } from "../../services/rag/pipeline/pipeline.types";
import { type CollectionRouterConfig, CollectionRouterService } from "../../services/routing/collection-router.service";
import { createSpanWithTiming } from "../../telemetry/telemetry.middleware";
import type { CollectionRoutingInput, CollectionRoutingOutput } from "../../types/stages";

export interface CollectionRoutingStageConfig extends CollectionRouterConfig {}

export class CollectionRoutingStage implements IPipelineStage<CollectionRoutingInput, CollectionRoutingOutput> {
  readonly name = "collection-routing";

  private readonly routerService: CollectionRouterService;

  constructor(config?: CollectionRoutingStageConfig) {
    this.routerService = new CollectionRouterService(config);
  }

  async canExecute(input: CollectionRoutingInput): Promise<boolean> {
    return input.shouldUseFastPath !== true;
  }

  async execute(input: CollectionRoutingInput, context: PipelineContext): Promise<CollectionRoutingOutput> {
    const startTime = Date.now();
    const endSpan = context.traceContext
      ? createSpanWithTiming(this.name, "routing", context.traceContext, {
          query: input.query.slice(0, 100),
          entityTypes: input.intent.entityTypes,
          isTemporalQuery: input.intent.isTemporalQuery,
        })
      : null;

    const routingResult = await this.routerService.routeCollections(input.query, input.intent, context.traceContext);

    const duration = Date.now() - startTime;
    if (endSpan) {
      endSpan({
        strategy: routingResult.strategy,
        confidence: routingResult.confidence,
        collectionsCount: routingResult.selectedCollections.length,
        collections: routingResult.selectedCollections.map((c) => c.vendor),
        duration,
      });
    }

    return {
      ...input,
      routingResult,
    };
  }
}
