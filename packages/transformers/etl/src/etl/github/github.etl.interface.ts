import type { GitHubRepositoryDataTarget } from "@ait/postgres";
import type { BaseVectorPoint } from "../etl.base.abstract";

export interface GitHubRepositoryVectorPoint extends BaseVectorPoint {
  payload: {
    type: "repository";
  } & Partial<GitHubRepositoryDataTarget>;
}

/**
 * Union type for GitHub vector points
 */
export type GitHubVectorPoint = GitHubRepositoryVectorPoint;
