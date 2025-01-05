import type { db } from "../../postgres.client";
import { githubRepositories } from "../../schemas/connector.github.schema";

export function getGitHubRepositoriesQuery(_db: typeof db, options?: { limit?: number }) {
  return _db
    .select({
      id: githubRepositories.id,
      name: githubRepositories.name,
      description: githubRepositories.description,
      stars: githubRepositories.stars,
      url: githubRepositories.url,
      createdAt: githubRepositories.createdAt,
      updatedAt: githubRepositories.updatedAt,
    })
    .from(githubRepositories)
    .limit(options?.limit ?? 100)
    .execute();
}
