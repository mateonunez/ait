import type { getPostgresClient, GitHubRepositoryDataTarget } from "@ait/postgres";
import { AbstractETL, type BaseVectorPoint, type RetryOptions } from "../etl.abstract";
import type { qdrant } from "@ait/qdrant";
import { ETLEmbeddingsService, type IEmbeddingsService } from "../../infrastructure/embeddings/etl.embeddings.service";

export interface GitHubRepositoryVectorPoint extends BaseVectorPoint {
  payload: {
    type: "repository";
  } & Partial<GitHubRepositoryDataTarget>;
}

/**
 * Union type for GitHub vector points
 */
export type GitHubVectorPoint = GitHubRepositoryVectorPoint;
