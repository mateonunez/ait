export const CODE_INGESTION_REPOS: string[] = ["mateonunez/ait"];

export const IGNORED_PATHS: RegExp[] = [
  /^node_modules\//,
  /^\.pnpm-store\//,
  /^dist\//,
  /^build\//,
  /^coverage\//,
  /^\.git\//,
  /^vendor\//,
  /^\.next\//,
  /^\.turbo\//,
  /^\.cache\//,
  // Lock files
  /package-lock\.json$/,
  /pnpm-lock\.yaml$/,
  /yarn\.lock$/,
  // Generated files
  /\.min\.(js|css)$/,
  /\.generated\./,
  /\.d\.ts\.map$/,
];

export const MAX_FILE_SIZE = 200 * 1024;

export function isIgnoredPath(path: string): boolean {
  return IGNORED_PATHS.some((pattern) => pattern.test(path));
}
