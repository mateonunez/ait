export {
  GitHubRepositoryEntity,
  mapGitHubRepository,
  mapGitHubRepositories,
  repositoryDomainToDataTarget,
  repositoryDataTargetToDomain,
} from "./github-repository.entity";

export {
  GitHubPullRequestEntity,
  mapGitHubPullRequest,
  mapGitHubPullRequests,
  pullRequestDomainToDataTarget,
  pullRequestDataTargetToDomain,
} from "./github-pull-request.entity";

export {
  GitHubCommitEntity,
  mapGitHubCommit,
  mapGitHubCommits,
  commitDomainToDataTarget,
  commitDataTargetToDomain,
} from "./github-commit.entity";

export {
  GitHubFileEntity,
  mapGitHubFile,
  mapGitHubFiles,
  fileDomainToDataTarget,
  fileDataTargetToDomain,
  type GitHubFileExternalWithContent,
} from "./github-file.entity";
