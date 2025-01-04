import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import sinon from "sinon";
import { ConnectorGitHubService } from "./connector.github.service";
import { ConnectorGitHub } from "../../infrastructure/github/connector.github";
import { ConnectorOAuth } from "../../shared/auth/lib/oauth/connector.oauth";
import type { IConnectorGitHubDataSource } from "../../infrastructure/github/data-source/connector.github.data-source.interface";
import { ConnectorGitHubNormalizer } from "../../infrastructure/github/normalizer/connector.github.normalizer";
import type { NormalizedGitHubRepository } from "../../infrastructure/github/normalizer/connector.github.normalizer.interface";

describe("ConnectorGitHubService", () => {
  let service: ConnectorGitHubService;
  let connectorStub: sinon.SinonStubbedInstance<ConnectorGitHub>;
  let normalizerStub: sinon.SinonStubbedInstance<ConnectorGitHubNormalizer>;
  let oauthStub: sinon.SinonStubbedInstance<ConnectorOAuth>;

  beforeEach(() => {
    oauthStub = sinon.createStubInstance(ConnectorOAuth);
    connectorStub = sinon.createStubInstance(ConnectorGitHub);
    normalizerStub = sinon.createStubInstance(ConnectorGitHubNormalizer);

    service = new ConnectorGitHubService();
    service.connector = connectorStub as unknown as ConnectorGitHub;
    connectorStub.normalizer = normalizerStub;
  });

  afterEach(() => {
    sinon.restore();
  });

  it("should instantiate correctly", () => {
    assert.ok(service);
  });

  it("should authenticate correctly", async () => {
    const code = "test-code";
    await service.authenticate(code);
    assert.ok(connectorStub.connect.calledOnceWith(code));
  });

  it("should return repositories", async () => {
    const mockRepositories = [
      { id: 1, name: "repo1" },
      { id: 2, name: "repo2" },
    ];
    const normalizedRepositories = [
      { id: "1", name: "repo1-normalized" },
      { id: "2", name: "repo2-normalized" },
    ];

    connectorStub.dataSource = {
      fetchRepositories: sinon.stub().resolves(mockRepositories),
    } as unknown as IConnectorGitHubDataSource;

    normalizerStub.normalize.callsFake(
      (repo) =>
        ({
          id: repo.id.toString(),
          name: `${repo.name}-normalized`,
        }) as unknown as NormalizedGitHubRepository,
    );

    const repositories = await service.getRepositories();
    assert.deepEqual(repositories, normalizedRepositories);
  });

  it("should return an empty array if dataSource is not set", async () => {
    connectorStub.dataSource = undefined;
    const repositories = await service.getRepositories();
    assert.deepEqual(repositories, []);
  });
});
