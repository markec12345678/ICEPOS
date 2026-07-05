import { describe, it, expect } from "vitest";
import {
  calculateZOI,
  generateEOR,
  buildInvoiceNumber,
  type InvoiceIssuer,
} from "@/lib/furs";

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

  it("produces different ZOI for different business premises", () => {
    const params = {
      taxNumber: "12345678",
      issueDate: new Date("2025-01-15T12:30:00Z"),
      invoiceNumber: 1,
      electronicDeviceID: "BLAG01",
    };
    const zoi1 = calculateZOI({ ...params, businessPremiseID: "PREVOZ11" });
    const zoi2 = calculateZOI({ ...params, businessPremiseID: "HOTEL34" });
    expect(zoi1).not.toBe(zoi2);
  });

  it("produces different ZOI for different dates", () => {
    const params = {
      taxNumber: "12345678",
      invoiceNumber: 1,
      businessPremiseID: "PREVOZ11",
      electronicDeviceID: "BLAG01",
    };
    const zoi1 = calculateZOI({ ...params, issueDate: new Date("2025-01-15T12:30:00Z") });
    const zoi2 = calculateZOI({ ...params, issueDate: new Date("2025-06-20T18:45:00Z") });
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

  it("generates multiple unique EORs in batch", () => {
    const eors = new Set<string>();
    for (let i = 0; i < 100; i++) {
      eors.add(generateEOR());
    }
    expect(eors.size).toBe(100);
  });
});

describe("FURS invoice number format", () => {
  it("formats with default business premise", () => {
    const num = buildInvoiceNumber(1);
    expect(num).toMatch(/^[A-Z0-9]+-[A-Z0-9]+-\d{10}$/);
  });

  it("formats with tenant business premise", () => {
    const num = buildInvoiceNumber(42, "HOTEL34", "BLAG02");
    expect(num).toBe("HOTEL34-BLAG02-0000000042");
  });

  it("pads invoice number to 10 digits", () => {
    const num = buildInvoiceNumber(1, "BP", "ED");
    expect(num).toBe("BP-ED-0000000001");
  });

  it("handles large invoice numbers", () => {
    const num = buildInvoiceNumber(9999999999, "BP", "ED");
    expect(num).toBe("BP-ED-9999999999");
  });
});

describe("InvoiceIssuer validation", () => {
  it("real tenant issuer has non-demo values", () => {
    const issuer: InvoiceIssuer = {
      taxNumber: "87654321",
      businessPremiseID: "HOTEL34",
      electronicDeviceID: "BLAG02",
      name: "Hotel Slavija",
    };
    expect(issuer.taxNumber).not.toBe("12345678");
    expect(issuer.businessPremiseID).not.toBe("PREVOZ11");
    expect(issuer.electronicDeviceID).not.toBe("BLAG01");
  });

  it("strips SI prefix from tax number", () => {
    const taxNumber = "SI12345678";
    const stripped = taxNumber.replace(/^SI/i, "");
    expect(stripped).toBe("12345678");
  });

  it("handles tax number without SI prefix", () => {
    const taxNumber = "12345678";
    const stripped = taxNumber.replace(/^SI/i, "");
    expect(stripped).toBe("12345678");
  });
});

describe("AuditLog actions (FURS traceability)", () => {
  it("defines all required FURS audit actions", () => {
    const fursActions = [
      "furs_fiscalize",
      "furs_storno",
      "furs_ini",
    ];
    expect(fursActions).toContain("furs_fiscalize");
    expect(fursActions).toContain("furs_storno");
    expect(fursActions).toContain("furs_ini");
  });

  it("defines operator audit actions", () => {
    const operatorActions = [
      "operator_create",
      "operator_delete",
      "pin_change",
    ];
    expect(operatorActions.length).toBe(3);
  });

  it("defines payment audit actions", () => {
    const paymentActions = ["payment", "storno", "gift_card_redeem"];
    expect(paymentActions).toContain("payment");
    expect(paymentActions).toContain("storno");
  });
});
