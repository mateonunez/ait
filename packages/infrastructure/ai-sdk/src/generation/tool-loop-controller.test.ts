import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { computeMaxSteps, shouldAppendFallback } from "./tool-loop-controller";

describe("tool-loop-controller", () => {
  it("should compute maxSteps with a final assistant step", () => {
    assert.equal(computeMaxSteps({ maxToolRounds: 3, hasTools: true }), 4);
    assert.equal(computeMaxSteps({ maxToolRounds: 0, hasTools: true }), 1);
    assert.equal(computeMaxSteps({ maxToolRounds: 3, hasTools: false }), 1);
  });

  it("should append fallback when tools ran but no text was produced", () => {
    assert.equal(shouldAppendFallback({ textLength: 0, totalToolResults: 1 }, 0), true);
    assert.equal(shouldAppendFallback({ textLength: 10, totalToolResults: 1 }, 0), false);
    assert.equal(shouldAppendFallback({ textLength: 0, totalToolResults: 0 }, 0), false);
    assert.equal(shouldAppendFallback({ textLength: 0, totalToolResults: 1 }, 5), false);
  });
});
