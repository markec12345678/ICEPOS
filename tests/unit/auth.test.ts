import { describe, it, expect } from "vitest";
import { hashPin, verifyPin, isLegacyPlaintextPin } from "@/lib/auth";

describe("PIN hashing", () => {
  it("hashes a PIN with scrypt format", () => {
    const hash = hashPin("1234");
    expect(hash).toMatch(/^scrypt:[a-f0-9]+:[a-f0-9]+$/);
    expect(hash).not.toBe("1234");
  });

  it("produces different hashes for same PIN (random salt)", () => {
    const h1 = hashPin("1234");
    const h2 = hashPin("1234");
    expect(h1).not.toBe(h2);
  });

  it("verifies correct PIN against scrypt hash", () => {
    const hash = hashPin("1234");
    expect(verifyPin("1234", hash)).toBe(true);
  });

  it("rejects wrong PIN against scrypt hash", () => {
    const hash = hashPin("1234");
    expect(verifyPin("9999", hash)).toBe(false);
  });

  it("verifies legacy plaintext PIN (backward compat)", () => {
    expect(verifyPin("1234", "1234")).toBe(true);
    expect(verifyPin("9999", "1234")).toBe(false);
  });

  it("detects legacy plaintext PINs", () => {
    expect(isLegacyPlaintextPin("1234")).toBe(true);
    expect(isLegacyPlaintextPin("scrypt:abc:def")).toBe(false);
  });
});
