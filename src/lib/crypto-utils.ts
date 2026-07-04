import { createCipheriv, createDecipheriv, scryptSync, randomBytes } from "crypto";

// ============================================================
// Encryption at rest — za občutljive podatke (npr. fursCertPassword)
// ============================================================
// Uporablja AES-256-GCM z derive-anim ključem iz NEXTAUTH_SECRET.
// Format: "enc:<iv-hex>:<authTag-hex>:<ciphertext-hex>"

const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const secret = process.env.NEXTAUTH_SECRET || "dev-secret-change-me";
  // Derive fixed-length key from secret using scrypt
  return scryptSync(secret, "icepos-salt", KEY_LENGTH);
}

/**
 * Encrypta plaintext z AES-256-GCM.
 * Vrne format: "enc:<iv>:<authTag>:<ciphertext>"
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return `enc:${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

/**
 * Decrypta vrednost iz format "enc:<iv>:<authTag>:<ciphertext>".
 * Če vrednost ni encryptana (plain text), vrne jo nespremenjeno (backward-compat).
 */
export function decrypt(value: string | null | undefined): string | null {
  if (!value) return null;
  
  // Backward-compat: če ni v "enc:" formatu, vrni kot plain text
  if (!value.startsWith("enc:")) {
    return value;
  }
  
  try {
    const parts = value.split(":");
    if (parts.length !== 4) return null;
    
    const [, ivHex, authTagHex, ciphertextHex] = parts;
    const key = getEncryptionKey();
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");
    const ciphertext = Buffer.from(ciphertextHex, "hex");
    
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);
    return decrypted.toString("utf8");
  } catch (e) {
    console.error("[crypto] Decrypt failed:", e);
    return null;
  }
}

/**
 * Ali je vrednost že encryptana?
 */
export function isEncrypted(value: string | null | undefined): boolean {
  return !!value && value.startsWith("enc:");
}
