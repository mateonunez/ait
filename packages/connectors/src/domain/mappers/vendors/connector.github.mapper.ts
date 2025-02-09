import type { GitHubRepositoryDataTarget } from "@ait/postgres";
import { ConnectorMapper } from "../connector.mapper";
import { connectorMapperPassThrough } from "../utils/connector.mapper.utils";
import type {
  GitHubRepositoryExternal,
  GitHubRepositoryEntity,
} from "@/types/domain/entities/vendors/connector.github.repository.types";
import type { ConnectorMapperDefinition } from "@/types/domain/mappers/connector.mapper.interface";

const githubRepositoryMapping: ConnectorMapperDefinition<
  GitHubRepositoryExternal,
  GitHubRepositoryEntity,
  GitHubRepositoryDataTarget
> = {
  id: {
    external: (external) => external.id.toString(),
    domain: (domain) => domain.id,
    dataTarget: (dataTarget) => dataTarget.id,
  },

  name: connectorMapperPassThrough<
    "name",
    string,
    GitHubRepositoryExternal,
    GitHubRepositoryEntity,
    GitHubRepositoryDataTarget
  >("name"),

  description: connectorMapperPassThrough<
    "description",
    string | null,
    GitHubRepositoryExternal,
    GitHubRepositoryEntity,
    GitHubRepositoryDataTarget
  >("description"),

  stars: {
    external: (external) => external.stargazers_count,
    domain: (domain) => domain.stars,
    dataTarget: (dataTarget) => dataTarget.stars,
  },

  forks: connectorMapperPassThrough<
    "forks",
    number,
    GitHubRepositoryExternal,
    GitHubRepositoryEntity,
    GitHubRepositoryDataTarget
  >("forks"),

  url: connectorMapperPassThrough<
    "url",
    string,
    GitHubRepositoryExternal,
    GitHubRepositoryEntity,
    GitHubRepositoryDataTarget
  >("url"),

  language: connectorMapperPassThrough<
    "language",
    string | null,
    GitHubRepositoryExternal,
    GitHubRepositoryEntity,
    GitHubRepositoryDataTarget
  >("language"),

  __type: {
    external: () => "repository" as const,
    domain: (domain) => domain.__type,
    dataTarget: () => "repository" as const,
  },
};

const domainDefaults = { __type: "repository" as const };

export const connectorGithubRepositoryMapper = new ConnectorMapper<
  GitHubRepositoryExternal,
  GitHubRepositoryEntity,
  GitHubRepositoryDataTarget
>(githubRepositoryMapping, domainDefaults);
