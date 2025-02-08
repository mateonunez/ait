import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { connectorMapperPassThrough } from "@/domain/mappers/utils/connector.mapper.utils";

type TestExternal = { testField?: string };
type TestDomain = { testField?: string };
type TestDataTarget = { testField?: string };

describe("connectorMapperPassThrough", () => {
  it("should create pass-through mappings for all levels", () => {
    const fieldName = "testField";
    const passThrough = connectorMapperPassThrough<"testField", string, TestExternal, TestDomain, TestDataTarget>(
      fieldName,
    );

    const entity: TestExternal = { testField: "testValue" };

    assert.equal(passThrough.external(entity), "testValue");
    assert.equal(passThrough.domain(entity), "testValue");
    assert.equal(passThrough.dataTarget(entity), "testValue");
  });

  it("should use fallback values when field is undefined", () => {
    const fieldName = "testField";
    const passThrough = connectorMapperPassThrough<"testField", string, TestExternal, TestDomain, TestDataTarget>(
      fieldName,
      {
        external: { fallback: "externalFallback" },
        domain: { fallback: "domainFallback" },
        dataTarget: { fallback: "dataTargetFallback" },
      },
    );

    const entity: TestExternal = {};

    assert.equal(passThrough.external(entity), "externalFallback");
    assert.equal(passThrough.domain(entity), "domainFallback");
    assert.equal(passThrough.dataTarget(entity), "dataTargetFallback");
  });

  it("should apply transform functions to the field values", () => {
    const fieldName = "testField";
    const passThrough = connectorMapperPassThrough<"testField", string, TestExternal, TestDomain, TestDataTarget>(
      fieldName,
      {
        external: { transform: (value) => `external_${value}` },
        domain: { transform: (value) => `domain_${value}` },
        dataTarget: { transform: (value) => `dataTarget_${value}` },
      },
    );

    const entity: TestExternal = { testField: "testValue" };

    assert.equal(passThrough.external(entity), "external_testValue");
    assert.equal(passThrough.domain(entity), "domain_testValue");
    assert.equal(passThrough.dataTarget(entity), "dataTarget_testValue");
  });

  it("should use fallback values and apply transform functions", () => {
    const fieldName = "testField";
    const passThrough = connectorMapperPassThrough<"testField", string, TestExternal, TestDomain, TestDataTarget>(
      fieldName,
      {
        external: { fallback: "externalFallback", transform: (value) => `external_${value}` },
        domain: { fallback: "domainFallback", transform: (value) => `domain_${value}` },
        dataTarget: { fallback: "dataTargetFallback", transform: (value) => `dataTarget_${value}` },
      },
    );

    const entity: TestExternal = {};

    assert.equal(passThrough.external(entity), "external_externalFallback");
    assert.equal(passThrough.domain(entity), "domain_domainFallback");
    assert.equal(passThrough.dataTarget(entity), "dataTarget_dataTargetFallback");
  });
});
