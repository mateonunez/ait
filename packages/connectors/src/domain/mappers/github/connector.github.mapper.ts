import type { GitHubRepository, GitHubRepositoryEntity } from "../../entities/github/connector.github.entities";
import type { GitHubRepositoryDataTarget } from "../../../infrastructure/db/schemas/connector.github.schema";
import { ConnectorMapper } from "../connector.mapper";
import type { ConnectorMapperDefinition } from "../connector.mapper.interface";
import { connectorMapperPassThrough } from "../utils/connector.mapper.utils";

/**
 * Represents the mapping between the GitHub repository entity and the GitHub repository data target.
 * See {@link packages/connectors/src/infrastructure/db/schemas/connector.github.schema.ts}
 */
const githubRepositoryMapping: ConnectorMapperDefinition<
  GitHubRepository,
  GitHubRepositoryEntity,
  GitHubRepositoryDataTarget
> = {
  id: {
    external: (external) => external.id.toString(),
    domain: (domain) => domain.id,
    dataTarget: (dataTarget) => Number(dataTarget.id),
  },
  name: connectorMapperPassThrough<"name", string>("name"),
  description: connectorMapperPassThrough<"description", string>("description"),
  stars: {
    external: (external) => external.stargazers_count,
    domain: (domain) => domain.stars,
    dataTarget: (dataTarget) => dataTarget.stars,
  },
  forks: connectorMapperPassThrough<"forks", number>("forks"),
  url: connectorMapperPassThrough<"url", string>("url"),
  language: connectorMapperPassThrough<"language", string>("language"),
  createdAt: connectorMapperPassThrough<"created_at", string>("created_at"),
  updatedAt: connectorMapperPassThrough<"updated_at", string>("updated_at"),
};

const domainDefaults = { type: "repository" as const };

export const connectorGithubMapper = new ConnectorMapper<
  GitHubRepository,
  GitHubRepositoryEntity,
  GitHubRepositoryDataTarget
>(githubRepositoryMapping, domainDefaults);
