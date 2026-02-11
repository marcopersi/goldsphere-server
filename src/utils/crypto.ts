/**
 * Crypto Utilities
 * 
 * Provides symmetric encryption for connector credentials.
 */

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const CREDENTIAL_KEY_ENV = "CONNECTOR_CREDENTIAL_KEY";
const IV_LENGTH = 12;

function getEncryptionKey(): Buffer {
  const keyBase64 = process.env[CREDENTIAL_KEY_ENV];
  if (!keyBase64) {
    throw new Error(`${CREDENTIAL_KEY_ENV} is not set`);
  }

  const key = Buffer.from(keyBase64, "base64");
  if (key.length !== 32) {
    throw new Error(`${CREDENTIAL_KEY_ENV} must be 32 bytes (base64 encoded)`);
  }

  return key;
}

export function encryptSecret(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv("aes-256-gcm", key, iv);

  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [iv, tag, ciphertext].map(part => part.toString("base64")).join(":");
}

export function decryptSecret(payload: string): string {
  const key = getEncryptionKey();
  const [ivBase64, tagBase64, dataBase64] = payload.split(":");

  if (!ivBase64 || !tagBase64 || !dataBase64) {
    throw new Error("Invalid encrypted payload format");
  }

  const iv = Buffer.from(ivBase64, "base64");
  const tag = Buffer.from(tagBase64, "base64");
  const data = Buffer.from(dataBase64, "base64");

  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);

  const plaintext = Buffer.concat([decipher.update(data), decipher.final()]);
  return plaintext.toString("utf8");
}
