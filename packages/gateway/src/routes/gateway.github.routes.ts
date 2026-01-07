import {
  CODE_INGESTION_REPOS,
  type ConnectorGitHubService,
  clearOAuthData,
  connectorServiceFactory,
  mapGitHubFile,
} from "@ait/connectors";
import { getLogger } from "@ait/core";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

const logger = getLogger();

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
  const getService = async (request: FastifyRequest, configId?: string): Promise<ConnectorGitHubService> => {
    let userId = (request.headers["x-user-id"] || (request.query as { userId?: string }).userId) as string | undefined;

    // Support extracting userId from OAuth state if it's encoded there
    const state = (request.query as { state?: string }).state;
    if (!userId && state && typeof state === "string" && state.includes(":")) {
      userId = state.split(":")[1];
    }

    const currentUserId = userId || "anonymous";

    if (configId) {
      return await connectorServiceFactory.getServiceByConfig<ConnectorGitHubService>(configId, currentUserId);
    }

    // Fallback/Legacy
    return connectorServiceFactory.getService<ConnectorGitHubService>(connectorType);
  };

  fastify.get("/auth", async (request: FastifyRequest<{ Querystring: { configId: string } }>, reply: FastifyReply) => {
    try {
      const { configId } = request.query;
      if (!configId) return reply.status(400).send({ error: "Missing configId" });

      const service = await getService(request, configId);
      const userId = (request.headers["x-user-id"] || (request.query as { userId?: string }).userId) as string;
      const config = service.connector.authenticator.getOAuthConfig();

      const params = new URLSearchParams({
        client_id: config.clientId,
        redirect_uri: config.redirectUri!,
        scope: "repo read:user user:email repo:status public_repo",
        state: `${configId}:${userId}`,
      });

      const authUrl = `https://github.com/login/oauth/authorize?${params}`;
      reply.redirect(authUrl);
    } catch (err: unknown) {
      fastify.log.error({ err, route: "/auth" }, "Failed to initiate GitHub authentication.");
      reply.status(500).send({ error: "Failed to initiate GitHub authentication." });
    }
  });

  fastify.get(
    "/auth/callback",
    async (request: FastifyRequest<{ Querystring: AuthCallbackQuery & { state?: string } }>, reply: FastifyReply) => {
      const { code, state } = request.query;
      const [configId] = (state || "").split(":");

      if (!code) {
        fastify.log.error({ route: "/auth/callback" }, "Missing authorization code.");
        return reply.status(400).send({ error: "Missing authorization code." });
      }

      try {
        const service = await getService(request, configId);
        await service.connector.connect(code);

        reply.send({
          success: true,
          message: "GitHub authentication successful.",
        });
      } catch (err: unknown) {
        fastify.log.error({ err, route: "/auth/callback" }, "Authentication failed.");
        reply.status(500).send({ error: "Authentication failed." });
      }
    },
  );

  fastify.post(
    "/auth/disconnect",
    async (request: FastifyRequest<{ Querystring: { configId?: string } }>, reply: FastifyReply) => {
      try {
        const { configId } = request.query;
        const userId = request.headers["x-user-id"] as string;
        await clearOAuthData(connectorType, userId);
        reply.send({ success: true, message: "GitHub disconnected successfully." });
      } catch (err: unknown) {
        fastify.log.error({ err, route: "/auth/disconnect" }, "Failed to disconnect GitHub.");
        reply.status(500).send({ error: "Failed to disconnect GitHub." });
      }
    },
  );

  fastify.get(
    "/repositories",
    async (request: FastifyRequest<{ Querystring: { configId?: string } }>, reply: FastifyReply) => {
      try {
        const { configId } = request.query;
        const service = await getService(request, configId);
        const repositories = await service.fetchRepositories();
        reply.send(repositories);
      } catch (err: unknown) {
        fastify.log.error({ err, route: "/repositories" }, "Failed to fetch repositories.");
        reply.status(500).send({ error: "Failed to fetch repositories." });
      }
    },
  );

  // Paginated data routes
  fastify.get(
    "/data/repositories",
    async (request: FastifyRequest<{ Querystring: PaginationQuery & { configId?: string } }>, reply: FastifyReply) => {
      try {
        const { configId } = request.query;
        const service = await getService(request, configId);
        const page = Number.parseInt(request.query.page || "1", 10);
        const limit = Number.parseInt(request.query.limit || "50", 10);

        const result = await service.getRepositoriesPaginated({ page, limit });
        reply.send(result);
      } catch (err: unknown) {
        fastify.log.error({ err, route: "/data/repositories" }, "Failed to fetch repositories from DB.");
        reply.status(500).send({ error: "Failed to fetch repositories from database." });
      }
    },
  );

  fastify.get(
    "/data/pull-requests",
    async (request: FastifyRequest<{ Querystring: PaginationQuery & { configId?: string } }>, reply: FastifyReply) => {
      try {
        const { configId } = request.query;
        const service = await getService(request, configId);
        const page = Number.parseInt(request.query.page || "1", 10);
        const limit = Number.parseInt(request.query.limit || "50", 10);

        const result = await service.getPullRequestsPaginated({ page, limit });
        reply.send(result);
      } catch (err: unknown) {
        fastify.log.error({ err, route: "/data/pull-requests" }, "Failed to fetch pull requests from DB.");
        reply.status(500).send({ error: "Failed to fetch pull requests from database." });
      }
    },
  );

  fastify.get(
    "/data/commits",
    async (request: FastifyRequest<{ Querystring: PaginationQuery & { configId?: string } }>, reply: FastifyReply) => {
      try {
        const { configId } = request.query;
        const service = await getService(request, configId);
        const page = Number.parseInt(request.query.page || "1", 10);
        const limit = Number.parseInt(request.query.limit || "50", 10);

        const result = await service.getCommitsPaginated({ page, limit });
        reply.send(result);
      } catch (err: unknown) {
        fastify.log.error({ err, route: "/data/commits" }, "Failed to fetch commits from DB.");
        reply.status(500).send({ error: "Failed to fetch commits from database." });
      }
    },
  );

  fastify.get(
    "/data/files",
    async (request: FastifyRequest<{ Querystring: PaginationQuery & { configId?: string } }>, reply: FastifyReply) => {
      try {
        const { configId } = request.query;
        const service = await getService(request, configId);
        const page = Number.parseInt(request.query.page || "1", 10);
        const limit = Number.parseInt(request.query.limit || "50", 10);

        const result = await service.getFilesPaginated({ page, limit });
        reply.send(result);
      } catch (err: unknown) {
        fastify.log.error({ err, route: "/data/files" }, "Failed to fetch files from DB.");
        reply.status(500).send({ error: "Failed to fetch files from database." });
      }
    },
  );

  // Refresh endpoint with optional entity filter
  fastify.post(
    "/refresh",
    async (
      request: FastifyRequest<{
        Querystring: { entities?: string; repo?: string; branch?: string; configId?: string };
      }>,
      reply: FastifyReply,
    ) => {
      try {
        const { entities: entitiesParam, repo, branch = "main", configId } = request.query;
        const service = await getService(request, configId);

        const entitiesToRefresh = entitiesParam
          ? entitiesParam.split(",").map((e) => e.trim().toLowerCase())
          : ["repositories", "pull-requests", "commits", "files"];

        const counts: Record<string, number | { added: number; updated: number; deleted: number }> = {};

        // Repositories
        if (entitiesToRefresh.includes("repositories")) {
          const repositories = await service.fetchRepositories();
          await service.connector.store.save(repositories);
          counts.repositories = repositories.length;
        }

        // Pull Requests
        if (entitiesToRefresh.includes("pull-requests") || entitiesToRefresh.includes("pullrequests")) {
          const pullRequests = await service.fetchPullRequests();
          await service.connector.store.save(pullRequests);
          counts.pullRequests = pullRequests.length;
        }

        // Commits
        if (entitiesToRefresh.includes("commits")) {
          const commits = await service.fetchCommits();
          await service.connector.store.save(commits);
          counts.commits = commits.length;
        }

        // Files - uses syncFiles to handle deletions
        if (entitiesToRefresh.includes("files")) {
          const repos = repo ? [repo] : CODE_INGESTION_REPOS;
          const dataSource = service.connector.dataSource;
          const fileRepository = service.connector.repository.file;

          let totalAdded = 0;
          let totalUpdated = 0;
          let totalDeleted = 0;

          for (const repoFullName of repos) {
            const [owner, repoName] = repoFullName.split("/");
            if (!owner || !repoName) continue;

            try {
              const tree = await dataSource.fetchRepositoryTree(owner, repoName, branch);
              const files: ReturnType<typeof mapGitHubFile>[] = [];

              for (const item of tree) {
                try {
                  const content = await dataSource.fetchFileContent(owner, repoName, item.path, branch);
                  if (dataSource.isTextFile(item.path, content)) {
                    const entity = mapGitHubFile({
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

              const result = await fileRepository.syncFiles(repoFullName, branch, files);
              totalAdded += result.added;
              totalUpdated += result.updated;
              totalDeleted += result.deleted;
            } catch (repoError: unknown) {
              fastify.log.warn(`Failed to process ${repoFullName}: ${(repoError as Error).message}`);
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
