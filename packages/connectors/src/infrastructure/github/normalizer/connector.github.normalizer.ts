import { ConnectorDataNormalizer } from "../../../shared/data/normalizer/connector.normalizer";
import type { ConnectorDataNormalizerMapping } from "../../../shared/data/normalizer/connector.normalizer.interface";
import type { GitHubRepository, NormalizedGitHubRepository } from "./connector.github.normalizer.interface";

const mapping: ConnectorDataNormalizerMapping<GitHubRepository, NormalizedGitHubRepository> = {
  id: (data) => data.id.toString(),
  name: "name",
  url: "html_url",
  fullName: "full_name",
  isPrivate: "private",
  createdAt: "created_at",
  updatedAt: "updated_at",
};

export class GitHubDataNormalizer extends ConnectorDataNormalizer<GitHubRepository, NormalizedGitHubRepository> {
  constructor() {
    super(mapping);
  }
}
