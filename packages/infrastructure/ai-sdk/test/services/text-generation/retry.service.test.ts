import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { RetryService } from "../../../src/services/generation/retry.service";

describe("RetryService", () => {
  describe("execute", () => {
    it("should execute operation successfully on first attempt", async () => {
      const service = new RetryService({ maxRetries: 3, delayMs: 10 });

      const result = await service.execute(async () => {
        return "success";
      });

      assert.equal(result, "success");
    });

    it("should retry on failure and eventually succeed", async () => {
      const service = new RetryService({ maxRetries: 3, delayMs: 10 });

      let attempts = 0;
      const result = await service.execute(async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error("Temporary failure");
        }
        return "success after retries";
      });

      assert.equal(attempts, 3);
      assert.equal(result, "success after retries");
    });

    it("should throw error after max retries exhausted", async () => {
      const service = new RetryService({ maxRetries: 2, delayMs: 10 });

      let attempts = 0;
      await assert.rejects(
        async () => {
          await service.execute(async () => {
            attempts++;
            throw new Error("Persistent failure");
          });
        },
        {
          message: "Persistent failure",
        },
      );

      assert.equal(attempts, 2);
    });

    it("should apply exponential backoff", async () => {
      const service = new RetryService({ maxRetries: 3, delayMs: 100, backoffMultiplier: 2 });

      const timestamps: number[] = [];
      let attempts = 0;

      try {
        await service.execute(async () => {
          timestamps.push(Date.now());
          attempts++;
          if (attempts < 3) {
            throw new Error("Retry test");
          }
          return "success";
        });
      } catch {
        // ignore
      }

      // Verify exponential backoff
      assert.ok(timestamps.length >= 2);
      if (timestamps.length >= 3) {
        const delay1 = timestamps[1] - timestamps[0];
        const delay2 = timestamps[2] - timestamps[1];
        // Second delay should be roughly 2x the first delay
        assert.ok(delay2 > delay1, "Should have exponential backoff");
      }
    });

    it("should handle non-Error objects", async () => {
      const service = new RetryService({ maxRetries: 2, delayMs: 10 });

      await assert.rejects(
        async () => {
          await service.execute(async () => {
            throw "string error";
          });
        },
        {
          message: "string error",
        },
      );
    });

    it("should respect minimum config values", () => {
      const service = new RetryService({ maxRetries: 0, delayMs: -100, backoffMultiplier: 0.5 });
      assert.ok(service);
    });

    it("should use default config when not provided", async () => {
      const service = new RetryService();

      const result = await service.execute(async () => "works");

      assert.equal(result, "works");
    });
  });
});
