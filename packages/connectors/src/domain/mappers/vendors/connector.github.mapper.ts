import type { GitHubRepositoryDataTarget } from "@ait/postgres";
import { ConnectorMapper } from "../connector.mapper";
import type { ConnectorMapperDefinition } from "../connector.mapper";
import { connectorMapperPassThrough } from "../utils/connector.mapper.utils";
import type {
  GitHubRepository,
  GitHubRepositoryEntity,
} from "@/types/domain/entities/vendors/connector.github.repository.types";

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
};

const domainDefaults = { type: "repository" as const };

export const connectorGithubMapper = new ConnectorMapper<
  GitHubRepository,
  GitHubRepositoryEntity,
  GitHubRepositoryDataTarget
>(githubRepositoryMapping, domainDefaults);
