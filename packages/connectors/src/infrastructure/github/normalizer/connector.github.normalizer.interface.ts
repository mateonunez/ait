export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  html_url: string;
  created_at: string;
  updated_at: string;
}

export interface NormalizedGitHubRepository {
  id: string;
  name: string;
  fullName: string;
  url: string;
  isPrivate: boolean;
  createdAt: string;
  updatedAt: string;
}
