import type { BaseMetadata } from "../types/documents";
import type { TitleComponents } from "../types/context";

export function extractTitleComponents(metadata: BaseMetadata): TitleComponents {
  return {
    type: metadata.__type || "Document",
    name: typeof metadata.name === "string" ? metadata.name : undefined,
    artist: typeof metadata.artist === "string" ? metadata.artist : undefined,
    title: typeof metadata.title === "string" ? metadata.title : undefined,
    description: typeof metadata.description === "string" ? metadata.description : undefined,
    repositoryName: typeof metadata.repositoryName === "string" ? metadata.repositoryName : undefined,
    repositoryFullName: typeof metadata.repositoryFullName === "string" ? metadata.repositoryFullName : undefined,
    number: typeof metadata.number === "number" ? metadata.number : undefined,
    fullName: typeof metadata.fullName === "string" ? metadata.fullName : undefined,
  };
}

export function buildTitle(components: TitleComponents): string {
  const { type, name, artist, title, description, repositoryName, repositoryFullName, number, fullName } = components;

  // Special handling for pull requests
  if (type === "pull_request") {
    const repo = repositoryFullName || repositoryName;
    const prNumber = number ? `#${number}` : "";
    const prTitle = title || "Unnamed PR";
    if (repo) {
      return `PR ${prNumber} in ${repo}: ${prTitle}`;
    }
    return `PR ${prNumber}: ${prTitle}`;
  }

  // Special handling for repositories
  if (type === "repository") {
    const repoName = fullName || name;
    if (repoName) {
      return `Repository: ${repoName}`;
    }
  }

  // Default handling for tracks, playlists, etc.
  const nameWithArtist = name && artist ? `${name} — ${artist}` : name;
  const fallback = nameWithArtist || title || description || type;

  return `${type} ${fallback}`.trim();
}

export function buildTitleFromMetadata(metadata: BaseMetadata): string {
  const components = extractTitleComponents(metadata);
  return buildTitle(components);
}
