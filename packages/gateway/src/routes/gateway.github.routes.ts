import { type ConnectorGitHubService, connectorServiceFactory } from "@ait/connectors";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

declare module "fastify" {
  interface FastifyInstance {
    githubService: ConnectorGitHubService;
  }
}

interface AuthCallbackQuery {
  code: string;
}

interface PaginationQuery {
  page?: string;
  limit?: string;
}

const connectorType = "github";

export default async function githubRoutes(fastify: FastifyInstance) {
  if (!fastify.githubService) {
    fastify.decorate("githubService", connectorServiceFactory.getService<ConnectorGitHubService>(connectorType));
  }

  const githubService = fastify.githubService;

  fastify.get("/auth", async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const params = new URLSearchParams({
        client_id: process.env.GITHUB_CLIENT_ID!,
        redirect_uri: process.env.GITHUB_REDIRECT_URI!,
        scope: "repo read:user user:email repo:status public_repo",
      });

      const authUrl = `${process.env.GITHUB_AUTH_URL}?${params}`;
      reply.redirect(authUrl);
    } catch (err: any) {
      fastify.log.error({ err, route: "/auth" }, "Failed to initiate GitHub authentication.");
      reply.status(500).send({ error: "Failed to initiate GitHub authentication." });
    }
  });

  fastify.get(
    "/auth/callback",
    async (request: FastifyRequest<{ Querystring: AuthCallbackQuery }>, reply: FastifyReply) => {
      const { code } = request.query;

      if (!code) {
        fastify.log.error({ route: "/auth/callback" }, "Missing authorization code.");
        return reply.status(400).send({ error: "Missing authorization code." });
      }

      try {
        await githubService.connector.connect(code);

        reply.send({
          success: true,
          message: "GitHub authentication successful.",
        });
      } catch (err: any) {
        fastify.log.error({ err, route: "/auth/callback" }, "Authentication failed.");
        reply.status(500).send({ error: "Authentication failed." });
      }
    },
  );

  fastify.get("/repositories", async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const repositories = await githubService.fetchRepositories();
      reply.send(repositories);
    } catch (err: any) {
      fastify.log.error({ err, route: "/repositories" }, "Failed to fetch repositories.");
      reply.status(500).send({ error: "Failed to fetch repositories." });
    }
  });

  // Paginated data routes
  fastify.get(
    "/data/repositories",
    async (request: FastifyRequest<{ Querystring: PaginationQuery }>, reply: FastifyReply) => {
      try {
        const page = Number.parseInt(request.query.page || "1", 10);
        const limit = Number.parseInt(request.query.limit || "50", 10);

        const result = await githubService.getRepositoriesPaginated({ page, limit });
        reply.send(result);
      } catch (err: unknown) {
        fastify.log.error({ err, route: "/data/repositories" }, "Failed to fetch repositories from DB.");
        reply.status(500).send({ error: "Failed to fetch repositories from database." });
      }
    },
  );

  fastify.get(
    "/data/pull-requests",
    async (request: FastifyRequest<{ Querystring: PaginationQuery }>, reply: FastifyReply) => {
      try {
        const page = Number.parseInt(request.query.page || "1", 10);
        const limit = Number.parseInt(request.query.limit || "50", 10);

        const result = await githubService.getPullRequestsPaginated({ page, limit });
        reply.send(result);
      } catch (err: unknown) {
        fastify.log.error({ err, route: "/data/pull-requests" }, "Failed to fetch pull requests from DB.");
        reply.status(500).send({ error: "Failed to fetch pull requests from database." });
      }
    },
  );

  fastify.get(
    "/data/commits",
    async (request: FastifyRequest<{ Querystring: PaginationQuery }>, reply: FastifyReply) => {
      try {
        const page = Number.parseInt(request.query.page || "1", 10);
        const limit = Number.parseInt(request.query.limit || "50", 10);

        const result = await githubService.getCommitsPaginated({ page, limit });
        reply.send(result);
      } catch (err: unknown) {
        fastify.log.error({ err, route: "/data/commits" }, "Failed to fetch commits from DB.");
        reply.status(500).send({ error: "Failed to fetch commits from database." });
      }
    },
  );

  fastify.get("/data/files", async (request: FastifyRequest<{ Querystring: PaginationQuery }>, reply: FastifyReply) => {
    try {
      const page = Number.parseInt(request.query.page || "1", 10);
      const limit = Number.parseInt(request.query.limit || "50", 10);

      const result = await githubService.getFilesPaginated({ page, limit });
      reply.send(result);
    } catch (err: unknown) {
      fastify.log.error({ err, route: "/data/files" }, "Failed to fetch files from DB.");
      reply.status(500).send({ error: "Failed to fetch files from database." });
    }
  });

  // Refresh endpoint with optional entity filter
  // Usage: POST /refresh?entities=repositories,files or POST /refresh (all entities)
  fastify.post(
    "/refresh",
    async (
      request: FastifyRequest<{ Querystring: { entities?: string; repo?: string; branch?: string } }>,
      reply: FastifyReply,
    ) => {
      try {
        const { entities: entitiesParam, repo, branch = "main" } = request.query;
        const entitiesToRefresh = entitiesParam
          ? entitiesParam.split(",").map((e) => e.trim().toLowerCase())
          : ["repositories", "pull-requests", "commits", "files"];

        const counts: Record<string, number | { added: number; updated: number; deleted: number }> = {};

        // Repositories
        if (entitiesToRefresh.includes("repositories")) {
          const repositories = await githubService.fetchRepositories();
          await githubService.connector.store.save(repositories);
          counts.repositories = repositories.length;
        }

        // Pull Requests
        if (entitiesToRefresh.includes("pull-requests") || entitiesToRefresh.includes("pullrequests")) {
          const pullRequests = await githubService.fetchPullRequests();
          await githubService.connector.store.save(pullRequests);
          counts.pullRequests = pullRequests.length;
        }

        // Commits
        if (entitiesToRefresh.includes("commits")) {
          const commits = await githubService.fetchCommits();
          await githubService.connector.store.save(commits);
          counts.commits = commits.length;
        }

        // Files - uses syncFiles to handle deletions
        if (entitiesToRefresh.includes("files")) {
          const { CODE_INGESTION_REPOS, connectorGithubFileMapper } = await import("@ait/connectors");
          const repos = repo ? [repo] : CODE_INGESTION_REPOS;
          const dataSource = githubService.connector.dataSource;
          const fileRepository = githubService.connector.repository.file;

          let totalAdded = 0;
          let totalUpdated = 0;
          let totalDeleted = 0;

          for (const repoFullName of repos) {
            const [owner, repoName] = repoFullName.split("/");
            if (!owner || !repoName) continue;

            try {
              // Fetch current file tree from GitHub
              const tree = await dataSource.fetchRepositoryTree(owner, repoName, branch);
              const files: Awaited<ReturnType<typeof connectorGithubFileMapper.externalToDomain>>[] = [];

              // Fetch content for each text file
              for (const item of tree) {
                try {
                  const content = await dataSource.fetchFileContent(owner, repoName, item.path, branch);
                  if (dataSource.isTextFile(item.path, content)) {
                    const entity = connectorGithubFileMapper.externalToDomain({
                      ...item,
                      content,
                      repositoryId: repoFullName.replace("/", "-"),
                      repositoryFullName: repoFullName,
                      branch,
                    });
                    files.push(entity);
                  }
                } catch {
                  // Skip files that fail to fetch
                }
              }

              // Sync: add new, update changed, delete removed
              const result = await fileRepository.syncFiles(repoFullName, branch, files);
              totalAdded += result.added;
              totalUpdated += result.updated;
              totalDeleted += result.deleted;
            } catch (repoError: any) {
              fastify.log.warn(`Failed to process ${repoFullName}: ${repoError.message}`);
            }
          }

          counts.files = { added: totalAdded, updated: totalUpdated, deleted: totalDeleted };
        }

        reply.send({
          success: true,
          message: "GitHub data refreshed successfully",
          counts,
        });
      } catch (err: unknown) {
        fastify.log.error({ err, route: "/refresh" }, "Failed to refresh GitHub data.");
        reply.status(500).send({ error: "Failed to refresh GitHub data." });
      }
    },
  );
}
