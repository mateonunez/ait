import type { BaseMetadata } from "./documents";

export interface TitleComponents {
  type: string;
  name?: string;
  artist?: string;
  title?: string;
  description?: string;
}

export function extractTitleComponents(metadata: BaseMetadata): TitleComponents {
  return {
    type: metadata.__type || "Document",
    name: typeof metadata.name === "string" ? metadata.name : undefined,
    artist: typeof metadata.artist === "string" ? metadata.artist : undefined,
    title: typeof metadata.title === "string" ? metadata.title : undefined,
    description: typeof metadata.description === "string" ? metadata.description : undefined,
  };
}

export function buildTitle(components: TitleComponents): string {
  const { type, name, artist, title, description } = components;

  const nameWithArtist = name && artist ? `${name} — ${artist}` : name;

  const fallback = nameWithArtist || title || description || type;

  return `${type} ${fallback}`.trim();
}

export function buildTitleFromMetadata(metadata: BaseMetadata): string {
  const components = extractTitleComponents(metadata);
  return buildTitle(components);
}
