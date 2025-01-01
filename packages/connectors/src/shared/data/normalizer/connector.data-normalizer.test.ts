import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { ConnectorDataNormalizer } from "./connector.data-normalizer";
import type { ConnectorDataNormalizerMapping } from "./connector.data-normalizer.interface";

interface SourceData {
  firstName: string;
  lastName: string;
  age: number;
}

interface NormalizedData {
  first_name: string;
  last_name: string;
  age: number;
}

describe("ConnectorDataNormalizer", () => {
  let normalizer: ConnectorDataNormalizer<SourceData, NormalizedData>;

  beforeEach(() => {
    const mapping: ConnectorDataNormalizerMapping<SourceData, NormalizedData> = {
      first_name: "firstName",
      last_name: "lastName",
      age: "age",
    };
    normalizer = new ConnectorDataNormalizer<SourceData, NormalizedData>(mapping);
  });

  it("should instantiate correctly", () => {
    assert.ok(normalizer);
  });

  it("should normalize data correctly", () => {
    const sourceData: SourceData = {
      firstName: "John",
      lastName: "Doe",
      age: 30,
    };
    const expectedNormalizedData: NormalizedData = {
      first_name: "John",
      last_name: "Doe",
      age: 30,
    };
    const normalizedData = normalizer.normalize(sourceData);
    assert.deepEqual(normalizedData, expectedNormalizedData);
  });

  it("should handle empty data correctly", () => {
    const sourceData = {} as SourceData;
    const expectedNormalizedData = {} as NormalizedData;
    const normalizedData = normalizer.normalize(sourceData);
    assert.deepEqual(normalizedData, expectedNormalizedData);
  });
});

describe("ConnectorDataNormalizer with function-based transformations", () => {
  it("should transform data using functions and direct keys", () => {
    const mapping: ConnectorDataNormalizerMapping<SourceData, NormalizedData> = {
      first_name: (source) => source.firstName.toUpperCase(),
      last_name: "lastName",
      age: (source) => source.age + 5,
    };
    const normalizer = new ConnectorDataNormalizer<SourceData, NormalizedData>(mapping);
    const sourceData: SourceData = {
      firstName: "Alice",
      lastName: "Smith",
      age: 25,
    };
    const expectedNormalizedData: NormalizedData = {
      first_name: "ALICE",
      last_name: "Smith",
      age: 30,
    };
    const normalizedData = normalizer.normalize(sourceData);
    assert.deepEqual(normalizedData, expectedNormalizedData);
  });
});

describe("ConnectorDataNormalizer skipping undefined fields", () => {
  it("should skip fields that are undefined", () => {
    const mapping: ConnectorDataNormalizerMapping<Partial<SourceData>, Partial<NormalizedData>> = {
      first_name: "firstName",
      last_name: (data) => data.lastName ? data.lastName.toLowerCase() : undefined,
      age: "age",
    };
    const normalizer = new ConnectorDataNormalizer<Partial<SourceData>, Partial<NormalizedData>>(mapping);
    const sourceData: Partial<SourceData> = {
      firstName: "Bob",
    };
    const normalizedData = normalizer.normalize(sourceData);
    assert.deepEqual(normalizedData, { first_name: "Bob" });
  });

  it("should assign fields that are defined", () => {
    const mapping: ConnectorDataNormalizerMapping<Partial<SourceData>, Partial<NormalizedData>> = {
      first_name: "firstName",
      last_name: (data) => data.lastName ? data.lastName.toLowerCase() : undefined,
      age: "age",
    };
    const normalizer = new ConnectorDataNormalizer<Partial<SourceData>, Partial<NormalizedData>>(mapping);
    const sourceData: Partial<SourceData> = {
      firstName: "Bob",
      age: 40,
    };
    const normalizedData = normalizer.normalize(sourceData);
    assert.deepEqual(normalizedData, { first_name: "Bob", age: 40 });
  });
});
