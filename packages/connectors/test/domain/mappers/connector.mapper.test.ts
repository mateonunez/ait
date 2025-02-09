import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ConnectorMapper, mapperConfig } from "@/domain/mappers/connector.mapper";
import type { DataTargetEntity, DomainEntity, ExternalEntity } from "@/types/domain/mappers/connector.mapper.interface";

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
