// Services
export * from "./services/connector.service.factory";
export * from "./services/vendors/connector.github.service";
export * from "./services/vendors/connector.linear.service";
export * from "./services/vendors/connector.spotify.service";
export * from "./services/vendors/connector.x.service";
export * from "./services/vendors/connector.notion.service";
export * from "./services/vendors/connector.slack.service";
export * from "./services/vendors/connector.google-calendar.service";

// Types
export type * from "./types/infrastructure/connector.interface";
export type * from "./types/services/connector.service.interface";

// Constants
export * from "./shared/constants/ait.constant";
export { SUPPORTED_VENDORS } from "@ait/core";

// OAuth
export type * from "./shared/auth/lib/oauth/connector.oauth";
export * from "./shared/auth/lib/oauth/connector.oauth";
export { clearOAuthData, getOAuthData } from "./shared/auth/lib/oauth/connector.oauth.utils";

// Base Classes & Abstracts
export * from "./services/connector.service.base.abstract";
export * from "./infrastructure/connector.base.abstract";
export * from "./shared/auth/connector.authenticator.abstract";

// Repository Types
export type * from "./types/domain/entities/vendors/connector.github.repository.types";
export type * from "./types/domain/entities/vendors/connector.github.pull-request.types";
export type * from "./types/domain/entities/vendors/connector.linear.types";
export type * from "./types/domain/entities/vendors/connector.spotify.types";
export type * from "./types/domain/entities/vendors/connector.x.repository.types";
export type * from "./types/domain/entities/vendors/connector.slack.types";
export type * from "./types/domain/entities/vendors/connector.google.types";

// Sync state service
export * from "./services/shared/sync";

// Entity types enums
export {
  GITHUB_ENTITY_TYPES_ENUM,
  SPOTIFY_ENTITY_TYPES_ENUM,
  X_ENTITY_TYPES_ENUM,
  LINEAR_ENTITY_TYPES_ENUM,
  NOTION_ENTITY_TYPES_ENUM,
  SLACK_ENTITY_TYPES_ENUM,
  GOOGLE_ENTITY_TYPES_ENUM,
} from "./services/vendors/connector.vendors.config";

export type { ConnectorCursor } from "./services/vendors/connector.vendors.config";

// GitHub code ingestion
export { CODE_INGESTION_REPOS } from "./shared/constants/code-ingestion.constants";
export {
  connectorGithubFileMapper,
  type GitHubFileExternalWithContent,
} from "./domain/mappers/vendors/connector.github.file.mapper";
export {
  ConnectorGitHubFileRepository,
  type IConnectorGitHubFileRepository,
} from "./domain/entities/vendors/github/connector.github.file.repository";
