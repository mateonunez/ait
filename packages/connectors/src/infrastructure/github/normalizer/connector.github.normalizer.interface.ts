export interface GitHubRepository {
  id: number;
  node_id: string;
  name: string;
  full_name: string;
  license: {
    key: string;
    name: string;
    url: string | null;
    spdx_id: string | null;
    node_id: string;
    html_url?: string;
  } | null;
  created_at: string | null;
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
