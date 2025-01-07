import type { GitHubRepositoryDataTarget } from "@ait/postgres";
import type { BaseVectorPoint } from "../retove.base-etl.abstract";

export interface RetoveGitHubRepositoryVectorPoint extends BaseVectorPoint {
  payload: {
    type: "repository";
  } & Partial<GitHubRepositoryDataTarget>;
}

/**
 * Union type for GitHub vector points
 */
export type RetoveGitHubVectorPoint = RetoveGitHubRepositoryVectorPoint;
