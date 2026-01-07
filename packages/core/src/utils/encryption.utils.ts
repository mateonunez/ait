import CryptoJS from "crypto-js";

/**
 * Encrypts a string using AES-256.
 * Note: Uses AES-256-CBC in CryptoJS by default when provided with a key and IV.
 * @param text - The plain text to encrypt.
 * @param secretKey - The encryption key.
 * @returns An object containing the IV and the encrypted content (hex format).
 */
export function encrypt(text: string, secretKey: string): { iv: string; content: string } {
  const iv = CryptoJS.lib.WordArray.random(16);
  const key = CryptoJS.enc.Hex.parse(secretKey);

  const encrypted = CryptoJS.AES.encrypt(text, key, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });

  return {
    iv: iv.toString(CryptoJS.enc.Hex),
    content: encrypted.ciphertext.toString(CryptoJS.enc.Hex),
  };
}

/**
 * Decrypts a string using AES-256.
 * @param encrypted - The encrypted content (hex string).
 * @param iv - The initialization vector (hex string).
 * @param secretKey - The encryption key.
 * @returns The decrypted plain text.
 */
export function decrypt(encrypted: string, iv: string, secretKey: string): string {
  const ivParsed = CryptoJS.enc.Hex.parse(iv);
  const keyParsed = CryptoJS.enc.Hex.parse(secretKey);
  const encryptedParsed = CryptoJS.enc.Hex.parse(encrypted);

  // CryptoJS.AES.decrypt expects a CipherParams object or a Base64 string
  const ciphertextBase64 = CryptoJS.enc.Base64.stringify(encryptedParsed);

  const decrypted = CryptoJS.AES.decrypt(ciphertextBase64, keyParsed, {
    iv: ivParsed,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });

  return decrypted.toString(CryptoJS.enc.Utf8);
}
