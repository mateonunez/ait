import { Expose, Transform, instanceToPlain, plainToInstance } from "class-transformer";
import { countLines, detectLanguage, getExtension, getFilename } from "../../utils/github-file.utils";

/**
 * Extended external type with content and context.
 */
export interface GitHubFileExternalWithContent {
  path: string;
  sha: string;
  content: string;
  size?: number;
  repositoryId: string;
  repositoryFullName: string;
  branch: string;
  __type?: "github_tree_item";
}

/**
 * GitHub File entity with class-transformer decorators.
 */
export class GitHubFileEntity {
  // Computed from repositoryId:path:sha
  @Expose()
  @Transform(({ obj }: any) => `${obj.repositoryId}:${obj.path}:${obj.sha}`)
  id!: string;

  @Expose()
  repositoryId!: string;

  @Expose()
  repositoryFullName!: string;

  @Expose()
  branch!: string;

  @Expose()
  path!: string;

  @Expose()
  @Transform(({ obj }: any) => getFilename(obj.path))
  name!: string;

  @Expose()
  sha!: string;

  @Expose()
  content!: string;

  @Expose()
  @Transform(({ value }: any) => value ?? 0)
  size!: number;

  @Expose()
  @Transform(({ obj }: any) => detectLanguage(obj.path))
  language!: string | null;

  @Expose()
  @Transform(({ obj }: any) => getExtension(obj.path))
  extension!: string | null;

  @Expose()
  @Transform(({ obj }: any) => countLines(obj.content || ""))
  linesOfCode!: number;

  @Expose()
  @Transform(({ value }: any) => (value ? new Date(value) : null))
  createdAt!: Date | null;

  @Expose()
  @Transform(({ value }: any) => (value ? new Date(value) : null))
  updatedAt!: Date | null;

  @Expose()
  readonly __type = "github_file" as const;

  toPlain<T = Record<string, unknown>>(): T {
    return instanceToPlain(this) as T;
  }

  static fromPlain<T extends Record<string, unknown>>(data: T): GitHubFileEntity {
    return plainToInstance(GitHubFileEntity, data, { excludeExtraneousValues: false });
  }
}

/**
 * Transform external GitHub file response to domain entity.
 */
export function mapGitHubFile(external: GitHubFileExternalWithContent): GitHubFileEntity {
  return plainToInstance(GitHubFileEntity, external, {
    excludeExtraneousValues: true,
    exposeDefaultValues: true,
  });
}

/**
 * Transform array of external responses.
 */
export function mapGitHubFiles(externals: GitHubFileExternalWithContent[]): GitHubFileEntity[] {
  return externals.map(mapGitHubFile);
}
