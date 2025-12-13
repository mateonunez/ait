import { randomUUID } from "node:crypto";
import { AItError, type GitHubFileEntity, type PaginatedResponse, type PaginationParams, getLogger } from "@ait/core";
import { drizzleOrm, getPostgresClient, githubRepositoryFiles } from "@ait/postgres";
import type { IConnectorRepositorySaveOptions } from "../../../../types/domain/entities/connector.repository.interface";
import { connectorGithubFileMapper } from "../../../mappers/vendors/connector.github.file.mapper";

const logger = getLogger();

export interface IConnectorGitHubFileRepository {
  saveFile(file: GitHubFileEntity, options?: IConnectorRepositorySaveOptions): Promise<void>;
  saveFiles(files: GitHubFileEntity[]): Promise<void>;
  getFile(id: string): Promise<GitHubFileEntity | null>;
  getFilesPaginated(params: PaginationParams): Promise<PaginatedResponse<GitHubFileEntity>>;
  getFilesByRepository(repositoryFullName: string, params?: PaginationParams): Promise<GitHubFileEntity[]>;
  deleteFile(id: string): Promise<void>;
  deleteFilesByRepository(repositoryFullName: string, branch?: string): Promise<number>;
  deleteStaleFiles(repositoryFullName: string, branch: string, currentPaths: string[]): Promise<number>;
  syncFiles(
    repositoryFullName: string,
    branch: string,
    files: GitHubFileEntity[],
  ): Promise<{ added: number; updated: number; deleted: number }>;
}

export class ConnectorGitHubFileRepository implements IConnectorGitHubFileRepository {
  private _pgClient = getPostgresClient();

  async saveFile(
    file: GitHubFileEntity,
    options: IConnectorRepositorySaveOptions = { incremental: false },
  ): Promise<void> {
    const { incremental } = options;
    const fileId = incremental ? randomUUID() : file.id;

    try {
      const fileData = connectorGithubFileMapper.domainToDataTarget(file);
      fileData.id = fileId;

      await this._pgClient.db.transaction(async (tx) => {
        await tx
          .insert(githubRepositoryFiles)
          .values(fileData)
          .onConflictDoUpdate({
            target: githubRepositoryFiles.id,
            set: {
              repositoryId: fileData.repositoryId,
              repositoryFullName: fileData.repositoryFullName,
              branch: fileData.branch,
              path: fileData.path,
              name: fileData.name,
              sha: fileData.sha,
              content: fileData.content,
              size: fileData.size,
              language: fileData.language,
              extension: fileData.extension,
              linesOfCode: fileData.linesOfCode,
              updatedAt: new Date(),
            },
          })
          .execute();
      });
    } catch (error: any) {
      logger.error("Failed to save file:", { fileId, error });
      throw new AItError("GITHUB_SAVE_FILE", `Failed to save file ${fileId}: ${error.message}`, { id: fileId }, error);
    }
  }

  async saveFiles(files: GitHubFileEntity[]): Promise<void> {
    if (!files.length) {
      return;
    }

    // Process in batches to avoid overwhelming the database
    const batchSize = 50;
    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);
      await Promise.all(batch.map((file) => this.saveFile(file)));
    }
  }

  async getFile(id: string): Promise<GitHubFileEntity | null> {
    const result = await this._pgClient.db
      .select()
      .from(githubRepositoryFiles)
      .where(drizzleOrm.eq(githubRepositoryFiles.id, id))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    return connectorGithubFileMapper.dataTargetToDomain(result[0]!);
  }

  async getFilesPaginated(params: PaginationParams): Promise<PaginatedResponse<GitHubFileEntity>> {
    const page = params.page || 1;
    const limit = params.limit || 50;
    const offset = (page - 1) * limit;

    const [files, totalResult] = await Promise.all([
      this._pgClient.db
        .select()
        .from(githubRepositoryFiles)
        .orderBy(drizzleOrm.desc(githubRepositoryFiles.updatedAt))
        .limit(limit)
        .offset(offset),
      this._pgClient.db.select({ count: drizzleOrm.count() }).from(githubRepositoryFiles),
    ]);

    const total = totalResult[0]?.count || 0;
    const totalPages = Math.ceil(total / limit);

    return {
      data: files.map((file) => connectorGithubFileMapper.dataTargetToDomain(file)),
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  async getFilesByRepository(repositoryFullName: string, params?: PaginationParams): Promise<GitHubFileEntity[]> {
    const limit = params?.limit || 100;
    const offset = ((params?.page || 1) - 1) * limit;

    const files = await this._pgClient.db
      .select()
      .from(githubRepositoryFiles)
      .where(drizzleOrm.eq(githubRepositoryFiles.repositoryFullName, repositoryFullName))
      .orderBy(drizzleOrm.asc(githubRepositoryFiles.path))
      .limit(limit)
      .offset(offset);

    return files.map((file) => connectorGithubFileMapper.dataTargetToDomain(file));
  }

  /**
   * Delete a single file by ID
   */
  async deleteFile(id: string): Promise<void> {
    await this._pgClient.db.delete(githubRepositoryFiles).where(drizzleOrm.eq(githubRepositoryFiles.id, id)).execute();
  }

  /**
   * Delete all files for a repository (and optionally a specific branch)
   */
  async deleteFilesByRepository(repositoryFullName: string, branch?: string): Promise<number> {
    const conditions = [drizzleOrm.eq(githubRepositoryFiles.repositoryFullName, repositoryFullName)];
    if (branch) {
      conditions.push(drizzleOrm.eq(githubRepositoryFiles.branch, branch));
    }

    const result = await this._pgClient.db
      .delete(githubRepositoryFiles)
      .where(drizzleOrm.and(...conditions))
      .returning({ id: githubRepositoryFiles.id });

    logger.info(`Deleted ${result.length} files from ${repositoryFullName}${branch ? `@${branch}` : ""}`);
    return result.length;
  }

  /**
   * Delete files that are no longer in the repository (stale files)
   * This compares the database paths against the current paths from GitHub
   */
  async deleteStaleFiles(repositoryFullName: string, branch: string, currentPaths: string[]): Promise<number> {
    if (currentPaths.length === 0) {
      // If no paths provided, don't delete anything (safety)
      return 0;
    }

    // Get all paths currently in DB for this repo/branch
    const dbFiles = await this._pgClient.db
      .select({ id: githubRepositoryFiles.id, path: githubRepositoryFiles.path })
      .from(githubRepositoryFiles)
      .where(
        drizzleOrm.and(
          drizzleOrm.eq(githubRepositoryFiles.repositoryFullName, repositoryFullName),
          drizzleOrm.eq(githubRepositoryFiles.branch, branch),
        ),
      );

    // Find paths in DB but not in current repo (deleted files)
    const currentPathsSet = new Set(currentPaths);
    const staleFiles = dbFiles.filter((f) => !currentPathsSet.has(f.path));

    if (staleFiles.length === 0) {
      return 0;
    }

    // Delete stale files
    const staleIds = staleFiles.map((f) => f.id);
    await this._pgClient.db
      .delete(githubRepositoryFiles)
      .where(drizzleOrm.inArray(githubRepositoryFiles.id, staleIds))
      .execute();

    logger.info(`Deleted ${staleFiles.length} stale files from ${repositoryFullName}@${branch}`, {
      deletedPaths: staleFiles.map((f) => f.path).slice(0, 10), // Log first 10
    });

    return staleFiles.length;
  }

  /**
   * Full sync: saves new/updated files and removes deleted files
   * This is the recommended method for refreshing code files
   */
  async syncFiles(
    repositoryFullName: string,
    branch: string,
    files: GitHubFileEntity[],
  ): Promise<{ added: number; updated: number; deleted: number }> {
    // 1. Get current paths from GitHub
    const currentPaths = files.map((f) => f.path);

    // 2. Delete files that no longer exist
    const deleted = await this.deleteStaleFiles(repositoryFullName, branch, currentPaths);

    // 3. Get existing file SHAs to determine adds vs updates
    const existingFiles = await this._pgClient.db
      .select({ path: githubRepositoryFiles.path, sha: githubRepositoryFiles.sha })
      .from(githubRepositoryFiles)
      .where(
        drizzleOrm.and(
          drizzleOrm.eq(githubRepositoryFiles.repositoryFullName, repositoryFullName),
          drizzleOrm.eq(githubRepositoryFiles.branch, branch),
        ),
      );

    const existingShaMap = new Map(existingFiles.map((f) => [f.path, f.sha]));

    let added = 0;
    let updated = 0;

    // 4. Save all files (will upsert)
    for (const file of files) {
      const existingSha = existingShaMap.get(file.path);
      if (!existingSha) {
        added++;
      } else if (existingSha !== file.sha) {
        updated++;
      }
      // Skip if SHA unchanged (no actual change)
      if (existingSha === file.sha) {
        continue;
      }

      await this.saveFile(file);
    }

    logger.info(`Synced files for ${repositoryFullName}@${branch}: +${added}, ~${updated}, -${deleted}`);

    return { added, updated, deleted };
  }
}
