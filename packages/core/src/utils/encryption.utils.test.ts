import assert from "node:assert";
import { randomBytes } from "node:crypto";
import test, { describe } from "node:test";
import { decrypt, encrypt } from "./encryption.utils.js";

describe("Encryption Utils", () => {
  const secretKey = randomBytes(32).toString("hex");
  const plainText = "Hello, Scalable Connectors!";

  test("should encrypt and decrypt back to the original text", () => {
    const { iv, content } = encrypt(plainText, secretKey);

    assert.ok(iv);
    assert.ok(content);
    assert.notStrictEqual(content, plainText);

    const decrypted = decrypt(content, iv, secretKey);
    assert.strictEqual(decrypted, plainText);
  });

  test("should fail to decrypt with dynamic/wrong key", () => {
    const { iv, content } = encrypt(plainText, secretKey);
    const wrongKey = randomBytes(32).toString("hex");

    assert.throws(() => decrypt(content, iv, wrongKey));
  });
});
