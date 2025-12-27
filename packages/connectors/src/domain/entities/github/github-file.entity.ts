import "reflect-metadata";
import type { GitHubFileDataTarget } from "@ait/postgres";
import { Expose, Transform, instanceToPlain, plainToInstance } from "class-transformer";

/**
 * Language detection by file extension.
 */
function detectLanguage(path: string): string | null {
  const ext = path.substring(path.lastIndexOf(".")).toLowerCase();
  const languageMap: Record<string, string> = {
    ".ts": "TypeScript",
    ".tsx": "TypeScript",
    ".js": "JavaScript",
    ".jsx": "JavaScript",
    ".py": "Python",
    ".rb": "Ruby",
    ".go": "Go",
    ".rs": "Rust",
    ".java": "Java",
    ".kt": "Kotlin",
    ".swift": "Swift",
    ".c": "C",
    ".cpp": "C++",
    ".h": "C",
    ".hpp": "C++",
    ".cs": "C#",
    ".php": "PHP",
    ".md": "Markdown",
    ".json": "JSON",
    ".yaml": "YAML",
    ".yml": "YAML",
    ".html": "HTML",
    ".css": "CSS",
    ".scss": "SCSS",
    ".sql": "SQL",
    ".sh": "Shell",
    ".bash": "Shell",
    ".zsh": "Shell",
  };
  return languageMap[ext] ?? null;
}

function countLines(content: string): number {
  return content.split("\n").length;
}

function getExtension(path: string): string | null {
  const lastDot = path.lastIndexOf(".");
  return lastDot > 0 ? path.substring(lastDot) : null;
}

function getFilename(path: string): string {
  const lastSlash = path.lastIndexOf("/");
  return lastSlash >= 0 ? path.substring(lastSlash + 1) : path;
}

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
  __type?: "tree_item";
}

/**
 * GitHub File entity with class-transformer decorators.
 */
export class GitHubFileEntity {
  // Computed from repositoryId:path:sha
  @Expose()
  @Transform(({ obj }) => `${obj.repositoryId}:${obj.path}:${obj.sha}`)
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
  @Transform(({ obj }) => getFilename(obj.path))
  name!: string;

  @Expose()
  sha!: string;

  @Expose()
  content!: string;

  @Expose()
  @Transform(({ value }) => value ?? 0)
  size!: number;

  @Expose()
  @Transform(({ obj }) => detectLanguage(obj.path))
  language!: string | null;

  @Expose()
  @Transform(({ obj }) => getExtension(obj.path))
  extension!: string | null;

  @Expose()
  @Transform(({ obj }) => countLines(obj.content || ""))
  linesOfCode!: number;

  @Expose()
  @Transform(({ value }) => (value ? new Date(value) : null))
  createdAt!: Date | null;

  @Expose()
  @Transform(({ value }) => (value ? new Date(value) : null))
  updatedAt!: Date | null;

  readonly __type = "repository_file" as const;
}

/**
 * Transform external GitHub file response to domain entity.
 */
export function mapGitHubFile(external: GitHubFileExternalWithContent): GitHubFileEntity {
  return plainToInstance(GitHubFileEntity, external, {
    excludeExtraneousValues: true,
  });
}

/**
 * Transform array of external responses.
 */
export function mapGitHubFiles(externals: GitHubFileExternalWithContent[]): GitHubFileEntity[] {
  return externals.map(mapGitHubFile);
}

// --- Domain ↔ DataTarget (DB) using class-transformer ---

export function fileDomainToDataTarget(domain: GitHubFileEntity): GitHubFileDataTarget {
  return instanceToPlain(domain) as GitHubFileDataTarget;
}

export function fileDataTargetToDomain(dataTarget: GitHubFileDataTarget): GitHubFileEntity {
  return plainToInstance(GitHubFileEntity, dataTarget, {
    excludeExtraneousValues: false,
  });
}
