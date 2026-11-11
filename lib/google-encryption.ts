
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "crypto";

const algorithm = "aes-256-gcm";

function getKey(): Buffer {
  const secret = process.env.GOOGLE_TOKEN_ENCRYPTION_KEY;

  if (!secret || !/^[0-9a-f]{64}$/i.test(secret)) {
    throw new Error("Clé de chiffrement Google invalide ou manquante.");
  }

  return Buffer.from(secret, "hex");
}

export function encryptGoogleToken(token: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(algorithm, getKey(), iv);

  const encrypted = Buffer.concat([
    cipher.update(token, "utf8"),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  return [
    iv.toString("hex"),
    authTag.toString("hex"),
    encrypted.toString("hex"),
  ].join(":");
}

export function decryptGoogleToken(value: string): string {
  const [ivHex, authTagHex, encryptedHex] = value.split(":");

  if (!ivHex || !authTagHex || !encryptedHex) {
    throw new Error("Jeton Google chiffré invalide.");
  }

  const decipher = createDecipheriv(
    algorithm,
    getKey(),
    Buffer.from(ivHex, "hex")
  );

  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));

  return Buffer.concat([
    decipher.update(Buffer.from(encryptedHex, "hex")),
    decipher.final(),
  ]).toString("utf8");
}
