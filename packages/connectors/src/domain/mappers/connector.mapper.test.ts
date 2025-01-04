import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ConnectorMapper } from "./connector.mapper";
import type { ConnectorMapperDefinition } from "./connector.mapper.interface";
import { connectorMapperPassThrough } from "./utils/connector.mapper.utils";

interface ExternalEntity {
  id: string;
  name: string;
  externalField: string;
}

interface DomainEntity {
  id: string;
  name: string;
  domainField: string;
}

interface DataTargetEntity {
  id: string;
  name: string;
  dataTargetField: string;
}

const mapperConfig: ConnectorMapperDefinition<ExternalEntity, DomainEntity, DataTargetEntity> = {
  id: connectorMapperPassThrough<"id", string>("id"),
  name: connectorMapperPassThrough<"name", string>("name"),

  domainField: {
    external: (ext) => ext.externalField,
    domain: (dom) => dom.domainField,
    dataTarget: (dt) => dt.dataTargetField,
  },
};

describe("ConnectorMapper", () => {
  const domainDefaults: Partial<DomainEntity> = {
    domainField: "defaultDomainField",
  };
  const mapper = new ConnectorMapper<ExternalEntity, DomainEntity, DataTargetEntity>(mapperConfig, domainDefaults);

  it("should map external entity to domain entity", () => {
    const external: ExternalEntity = {
      id: "1",
      name: "External Name",
      externalField: "External Field",
    };
    const expectedDomain: DomainEntity = {
      id: "1",
      name: "External Name",
      domainField: "External Field",
    };

    const domain = mapper.externalToDomain(external);
    assert.deepEqual(domain, expectedDomain);
  });

  it("should map domain entity to data target entity", () => {
    const domain: DomainEntity = {
      id: "1",
      name: "Domain Name",
      domainField: "Domain Field",
    };
    const expectedDataTarget: DataTargetEntity = {
      id: "1",
      name: "Domain Name",
      dataTargetField: "Domain Field",
    };

    const dataTarget = mapper.domainToDataTarget(domain);
    assert.deepEqual(dataTarget, expectedDataTarget);
  });

  it("should map data target entity to domain entity", () => {
    const dataTarget: DataTargetEntity = {
      id: "1",
      name: "Data Target Name",
      dataTargetField: "Data Target Field",
    };
    const expectedDomain: DomainEntity = {
      id: "1",
      name: "Data Target Name",
      domainField: "Data Target Field",
    };

    const domain = mapper.dataTargetToDomain(dataTarget);
    assert.deepEqual(domain, expectedDomain);
  });

  it("should apply domain defaults when mapping external entity to domain entity", () => {
    const external: ExternalEntity = {
      id: "1",
      name: "External Name",
      externalField: "External Field",
    };
    const expectedDomain: DomainEntity = {
      id: "1",
      name: "External Name",
      domainField: "External Field",
    };

    const domain = mapper.externalToDomain(external);
    assert.deepEqual(domain, expectedDomain);
  });
});
