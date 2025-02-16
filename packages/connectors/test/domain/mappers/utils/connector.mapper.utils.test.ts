import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { connectorMapperPassThrough, mapObjectToStringArray } from "@/domain/mappers/utils/connector.mapper.utils";

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

describe("mapObjectToStringArray", () => {
  it("should return an empty array for null or undefined input", () => {
    assert.deepEqual(mapObjectToStringArray(null), []);
    assert.deepEqual(mapObjectToStringArray(undefined), []);
  });

  it("should map object entries to a string array without options", () => {
    const obj = { a: 1, b: "test", c: { nested: "value" } };
    const result = mapObjectToStringArray(obj);
    // Expected: safeStringify of { nested: "value" } returns "{nested: value}"
    assert.deepEqual(result, ["a: 1", "b: test", "c: {nested: value}"]);
  });

  it("should use valueTransform when provided", () => {
    const obj = { a: 1, b: 2 };
    const result = mapObjectToStringArray(obj, {
      valueTransform: (value, key) => `val(${value})`,
    });
    assert.deepEqual(result, ["a: val(1)", "b: val(2)"]);
  });

  it("should limit depth based on maxDepth option", () => {
    const obj = { a: { b: { c: { d: 4 } } } };
    const result = mapObjectToStringArray(obj, { maxDepth: 2 });
    // At depth 0: root; depth 1: property "a"; depth 2: property "b" should be summarized.
    // For { b: { c: { d: 4 } } } at depth 1, safeStringify is called with depth 1,
    // then for key "b", safeStringify({ c: { d: 4 } }, depth=2) returns a summary.
    assert.deepEqual(result, ["a: {b: [Object with 1 keys]}"]);
  });

  it("should handle circular references gracefully", () => {
    const obj: Record<string, any> = { a: 1 };
    obj.self = obj;
    const result = mapObjectToStringArray(obj);
    // The shared seen set ensures that the circular reference is detected.
    assert.deepEqual(result, ["a: 1", "self: [Circular]"]);
  });

  it("should correctly handle arrays inside objects", () => {
    const obj = { arr: [1, { nested: 2 }] };
    const result = mapObjectToStringArray(obj);
    assert.deepEqual(result, ["arr: [1, {nested: 2}]"]);
  });

  it("should not filter out entries when filterEmpty is true if entries are non-empty", () => {
    const obj = { a: 1, b: "test" };
    const result = mapObjectToStringArray(obj, { filterEmpty: true });
    assert.deepEqual(result, ["a: 1", "b: test"]);
  });

  it("should exclude keys recursively", () => {
    const obj = {
      a: 1,
      b: { c: 2, d: 3, e: { f: 4, g: 5, h: 6 } },
      i: [
        { j: 7, k: 8 },
        { j: 9, d: 10 },
      ],
    };
    const result = mapObjectToStringArray(obj, { excludeKeys: ["d", "g"] });
    // Expected:
    // - In "b", key "d" is removed and in nested "e", key "g" is removed.
    // - In array "i", in the second element, key "d" is removed.
    assert.deepEqual(result, ["a: 1", "b: {c: 2, e: {f: 4, h: 6}}", "i: [{j: 7, k: 8}, {j: 9}]"]);
  });

  it("should apply exclusions when using a custom valueTransform", () => {
    const obj = { a: { b: { c: 2, d: 3 } } };
    const result = mapObjectToStringArray(obj, {
      valueTransform: (value) => JSON.stringify(value),
      excludeKeys: ["d"],
    });
    // After exclusions, { b: { c: 2, d: 3 } } becomes { b: { c: 2 } }
    // and JSON.stringify returns '{"b":{"c":2}}'
    assert.deepEqual(result, ['a: {"b":{"c":2}}']);
  });
});
