import { pgTable, varchar, integer, timestamp, boolean, text, jsonb } from "drizzle-orm/pg-core";

export const githubRepositories = pgTable("github_repositories", {
  id: varchar("id", { length: 255 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: varchar("description", { length: 500 }),
  stars: integer("stars").notNull(),
  forks: integer("forks").notNull(),
  url: varchar("url", { length: 255 }).notNull(),
  language: varchar("language", { length: 100 }),

  fullName: varchar("full_name", { length: 512 }),
  private: boolean("private").default(false),
  fork: boolean("fork").default(false),
  archived: boolean("archived").default(false),
  disabled: boolean("disabled").default(false),
  visibility: varchar("visibility", { length: 50 }),
  watchersCount: integer("watchers_count").default(0),
  openIssuesCount: integer("open_issues_count").default(0),
  size: integer("size").default(0),
  defaultBranch: varchar("default_branch", { length: 255 }),
  topics: text("topics").array(),
  isTemplate: boolean("is_template").default(false),
  hasIssues: boolean("has_issues").default(true),
  hasProjects: boolean("has_projects").default(true),
  hasWiki: boolean("has_wiki").default(true),
  hasPages: boolean("has_pages").default(false),
  hasDiscussions: boolean("has_discussions").default(false),
  homepage: varchar("homepage", { length: 512 }),
  pushedAt: timestamp("pushed_at"),
  licenseName: varchar("license_name", { length: 255 }),
  cloneUrl: varchar("clone_url", { length: 512 }),
  sshUrl: varchar("ssh_url", { length: 512 }),

  // JSONB fields for complex objects
  ownerData: jsonb("owner_data"),
  licenseData: jsonb("license_data"),
  metadata: jsonb("metadata"),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const githubPullRequests = pgTable("github_pull_requests", {
  id: varchar("id", { length: 255 }).primaryKey(),
  number: integer("number").notNull(),
  title: varchar("title", { length: 512 }).notNull(),
  body: text("body"),
  state: varchar("state", { length: 50 }).notNull(),
  draft: boolean("draft").default(false),
  locked: boolean("locked").default(false),
  htmlUrl: varchar("html_url", { length: 512 }).notNull(),
  diffUrl: varchar("diff_url", { length: 512 }),
  patchUrl: varchar("patch_url", { length: 512 }),
  issueUrl: varchar("issue_url", { length: 512 }),
  merged: boolean("merged").default(false),
  mergedAt: timestamp("merged_at"),
  closedAt: timestamp("closed_at"),
  mergeCommitSha: varchar("merge_commit_sha", { length: 255 }),
  commits: integer("commits").default(0),
  additions: integer("additions").default(0),
  deletions: integer("deletions").default(0),
  changedFiles: integer("changed_files").default(0),
  comments: integer("comments").default(0),
  reviewComments: integer("review_comments").default(0),
  headRef: varchar("head_ref", { length: 255 }),
  headSha: varchar("head_sha", { length: 255 }),
  baseRef: varchar("base_ref", { length: 255 }),
  baseSha: varchar("base_sha", { length: 255 }),
  repositoryId: varchar("repository_id", { length: 255 }),
  repositoryName: varchar("repository_name", { length: 255 }),
  repositoryFullName: varchar("repository_full_name", { length: 512 }),
  mergeable: boolean("mergeable"),
  maintainerCanModify: boolean("maintainer_can_modify").default(false),

  // JSONB fields for complex objects
  userData: jsonb("user_data"),
  assigneeData: jsonb("assignee_data"),
  assigneesData: jsonb("assignees_data"),
  mergedByData: jsonb("merged_by_data"),
  labels: jsonb("labels"),
  milestoneData: jsonb("milestone_data"),
  requestedReviewersData: jsonb("requested_reviewers_data"),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * DATA TARGET
 * Represents how we store the domain entity in a data layer (DB)
 */
export type GitHubRepositoryDataTarget = typeof githubRepositories.$inferInsert;
export type GitHubPullRequestDataTarget = typeof githubPullRequests.$inferInsert;
