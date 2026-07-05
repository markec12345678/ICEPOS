import { describe, it, expect } from "vitest";
import { calculateZOI, generateEOR } from "@/lib/furs";

describe("FURS ZOI computation", () => {
  it("generates 32-char hex MD5 of RSA-SHA256 signature", () => {
    const zoi = calculateZOI({
      taxNumber: "12345678",
      issueDate: new Date("2025-01-15T12:30:00Z"),
      invoiceNumber: 1,
      businessPremiseID: "PREVOZ11",
      electronicDeviceID: "BLAG01",
    });
    expect(zoi).toMatch(/^[A-F0-9]{32}$/);
  });

  it("produces different ZOI for different tax numbers", () => {
    const params = {
      issueDate: new Date("2025-01-15T12:30:00Z"),
      invoiceNumber: 1,
      businessPremiseID: "PREVOZ11",
      electronicDeviceID: "BLAG01",
    };
    const zoi1 = calculateZOI({ ...params, taxNumber: "12345678" });
    const zoi2 = calculateZOI({ ...params, taxNumber: "87654321" });
    expect(zoi1).not.toBe(zoi2);
  });

  it("produces different ZOI for different invoice numbers", () => {
    const params = {
      taxNumber: "12345678",
      issueDate: new Date("2025-01-15T12:30:00Z"),
      businessPremiseID: "PREVOZ11",
      electronicDeviceID: "BLAG01",
    };
    const zoi1 = calculateZOI({ ...params, invoiceNumber: 1 });
    const zoi2 = calculateZOI({ ...params, invoiceNumber: 2 });
    expect(zoi1).not.toBe(zoi2);
  });
});

describe("FURS EOR generation", () => {
  it("generates 32-char hex UUID without dashes", () => {
    const eor = generateEOR();
    expect(eor).toMatch(/^[A-F0-9]{32}$/);
    expect(eor).not.toContain("-");
  });

  it("generates unique EORs", () => {
    const eor1 = generateEOR();
    const eor2 = generateEOR();
    expect(eor1).not.toBe(eor2);
  });
});
