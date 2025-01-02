import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import sinon from "sinon";
import { ConnectorGitHubService } from "./connector.github.service";
import { ConnectorGitHubConnector } from "../../infrastructure/github/connector.github";
import { ConnectorOAuth } from "../../shared/auth/lib/oauth/connector.oauth";

describe("ConnectorGitHubService", () => {
  let service: ConnectorGitHubService;
  let connectorStub: sinon.SinonStubbedInstance<ConnectorGitHubConnector>;
  let oauthStub: sinon.SinonStubbedInstance<ConnectorOAuth>;

  beforeEach(() => {
    oauthStub = sinon.createStubInstance(ConnectorOAuth);
    connectorStub = sinon.createStubInstance(ConnectorGitHubConnector);

    service = new ConnectorGitHubService();
    service.connector = connectorStub as unknown as ConnectorGitHubConnector;
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
    const mockRepositories = [{ id: 1, name: "repo1" }, { id: 2, name: "repo2" }];
    connectorStub.retriever = {
      fetchRepositories: sinon.stub().resolves(mockRepositories),
    } as any;

    const repositories = await service.getRepositories();
    assert.deepEqual(repositories, mockRepositories);
  });

  it("should return an empty array if retriever is not set", async () => {
    connectorStub.retriever = undefined;
    const repositories = await service.getRepositories();
    assert.deepEqual(repositories, []);
  });
});
