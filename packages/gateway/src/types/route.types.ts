export interface OAuthCallbackQuery {
  code?: string;
  state?: string;
  userId?: string;
  configId?: string;
}

export interface PaginationQuery {
  page?: string;
  limit?: string;
  configId?: string;
}

export interface AuthQuery {
  configId?: string;
  userId?: string;
}

export interface RefreshQuery {
  entities?: string;
  configId?: string;
}
