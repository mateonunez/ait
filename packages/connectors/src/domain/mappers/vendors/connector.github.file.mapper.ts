import type { GitHubFileEntity, GitHubTreeItemExternal } from "@ait/core";
import type { GitHubFileDataTarget } from "@ait/postgres";
import type { ConnectorMapperDefinition } from "../../../types/domain/mappers/connector.mapper.interface";
import { ConnectorMapper } from "../connector.mapper";

export interface GitHubFileExternalWithContent extends GitHubTreeItemExternal {
  content: string;
  repositoryId: string;
  repositoryFullName: string;
  branch: string;
}

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

const githubFileMapping: ConnectorMapperDefinition<
  GitHubFileExternalWithContent,
  GitHubFileEntity,
  GitHubFileDataTarget
> = {
  id: {
    external: (external) => `${external.repositoryId}:${external.path}:${external.sha}`,
    domain: (domain) => domain.id,
    dataTarget: (dataTarget) => dataTarget.id,
  },

  repositoryId: {
    external: (external) => external.repositoryId,
    domain: (domain) => domain.repositoryId,
    dataTarget: (dataTarget) => dataTarget.repositoryId,
  },

  repositoryFullName: {
    external: (external) => external.repositoryFullName,
    domain: (domain) => domain.repositoryFullName,
    dataTarget: (dataTarget) => dataTarget.repositoryFullName,
  },

  branch: {
    external: (external) => external.branch,
    domain: (domain) => domain.branch,
    dataTarget: (dataTarget) => dataTarget.branch,
  },

  path: {
    external: (external) => external.path,
    domain: (domain) => domain.path,
    dataTarget: (dataTarget) => dataTarget.path,
  },

  name: {
    external: (external) => getFilename(external.path),
    domain: (domain) => domain.name,
    dataTarget: (dataTarget) => dataTarget.name,
  },

  sha: {
    external: (external) => external.sha,
    domain: (domain) => domain.sha,
    dataTarget: (dataTarget) => dataTarget.sha,
  },

  content: {
    external: (external) => external.content,
    domain: (domain) => domain.content,
    dataTarget: (dataTarget) => dataTarget.content,
  },

  size: {
    external: (external) => external.size ?? 0,
    domain: (domain) => domain.size,
    dataTarget: (dataTarget) => dataTarget.size ?? 0,
  },

  language: {
    external: (external) => detectLanguage(external.path),
    domain: (domain) => domain.language,
    dataTarget: (dataTarget) => dataTarget.language ?? null,
  },

  extension: {
    external: (external) => getExtension(external.path),
    domain: (domain) => domain.extension,
    dataTarget: (dataTarget) => dataTarget.extension ?? null,
  },

  linesOfCode: {
    external: (external) => countLines(external.content),
    domain: (domain) => domain.linesOfCode,
    dataTarget: (dataTarget) => dataTarget.linesOfCode ?? 0,
  },

  createdAt: {
    external: () => null,
    domain: (domain) => domain.createdAt,
    dataTarget: (dataTarget) => dataTarget.createdAt ?? null,
  },

  updatedAt: {
    external: () => null,
    domain: (domain) => domain.updatedAt,
    dataTarget: (dataTarget) => dataTarget.updatedAt ?? null,
  },

  __type: {
    external: () => "repository_file" as const,
    domain: (domain) => domain.__type,
    dataTarget: () => "repository_file" as const,
  },
};

const domainDefaults = { __type: "repository_file" as const };

export const connectorGithubFileMapper = new ConnectorMapper<
  GitHubFileExternalWithContent,
  GitHubFileEntity,
  GitHubFileDataTarget
>(githubFileMapping, domainDefaults);
