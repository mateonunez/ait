import type { OAuthTokenDataTarget } from "@ait/postgres";
import type { IConnectorOAuthTokenResponse } from "../../../../shared/auth/lib/oauth/connector.oauth";
import { clearOAuthData, getOAuthData, saveOAuthData } from "../../../../shared/auth/lib/oauth/connector.oauth.utils";
import type { IConnectorGitHubRepository } from "../../../../types/domain/entities/vendors/connector.github.repository.types";
import { ConnectorGitHubRepoRepository } from "./connector.github-repo.repository";
import { ConnectorGitHubCommitRepository } from "./connector.github.commit.repository";
import { ConnectorGitHubPullRequestRepository } from "./connector.github.pull-request.repository";

export class ConnectorGitHubRepository extends ConnectorGitHubRepoRepository implements IConnectorGitHubRepository {
  private _gitHubRepositoryRepository: ConnectorGitHubRepoRepository;
  private _gitHubPullRequestRepository: ConnectorGitHubPullRequestRepository;
  private _gitHubCommitRepository: ConnectorGitHubCommitRepository;

  constructor() {
    super();
    this._gitHubRepositoryRepository = new ConnectorGitHubRepoRepository();
    this._gitHubPullRequestRepository = new ConnectorGitHubPullRequestRepository();
    this._gitHubCommitRepository = new ConnectorGitHubCommitRepository();
  }

  public async saveAuthenticationData(data: IConnectorOAuthTokenResponse): Promise<void> {
    await saveOAuthData(data, "github");
  }

  public async getAuthenticationData(): Promise<OAuthTokenDataTarget | null> {
    return getOAuthData("github");
  }

  public async clearAuthenticationData(): Promise<void> {
    await clearOAuthData("github");
  }

  get repo(): ConnectorGitHubRepoRepository {
    return this._gitHubRepositoryRepository;
  }

  set repo(repo: ConnectorGitHubRepoRepository) {
    this._gitHubRepositoryRepository = repo;
  }

  get pullRequest(): ConnectorGitHubPullRequestRepository {
    return this._gitHubPullRequestRepository;
  }

  set pullRequest(pullRequest: ConnectorGitHubPullRequestRepository) {
    this._gitHubPullRequestRepository = pullRequest;
  }

  get commit(): ConnectorGitHubCommitRepository {
    return this._gitHubCommitRepository;
  }

  set commit(commit: ConnectorGitHubCommitRepository) {
    this._gitHubCommitRepository = commit;
  }
}
