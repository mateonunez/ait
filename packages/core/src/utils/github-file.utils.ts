/**
 * Language detection by file extension.
 */
export function detectLanguage(path: string): string | null {
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

export function countLines(content: string): number {
  return content.split("\n").length;
}

export function getExtension(path: string): string | null {
  const lastDot = path.lastIndexOf(".");
  return lastDot > 0 ? path.substring(lastDot) : null;
}

export function getFilename(path: string): string {
  const lastSlash = path.lastIndexOf("/");
  return lastSlash >= 0 ? path.substring(lastSlash + 1) : path;
}
