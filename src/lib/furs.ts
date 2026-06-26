// FURS fiskalni modul (POC) za slovensko SRS (Sistem Računov Slovenije)
//
// Implementira:
// - ZOI (Zaščitna oznaka izdajatelja) — MD5 hash RSA-podpisanega niza
// - EOR (Enkratna identifikacija računa) — UUID, ki ga vrne FURS (tukaj demo)
// - XML račun po FURS specifikaciji (Invoice)
// - Storno račun (Invoice + SubseqSeq>1)
//
// V produkciji:
// - Uporablja se pravi FURS certifikat (DATI / davčna blagajna) za podpis XML-a
// - Zahtevan je tudi INI / POR postopek pri FURS (predhodna prijava naprave)
// - Klic FURS REST API-ja (test/prod) za pridobitev EOR
//
// Reference:
// - https://www.fu.gov.si/slovenian_business/e_business/ebooks/furs/
// - Tehnična specifikacija eRačun (FURS, verzija 1.6+)

import crypto from "crypto";

// ============================================================================
// KONFIGURACIJA IZDAJATELJA
// ============================================================================

export const ISSUER = {
  // Davčna številka izdajatelja (brez "SI" predpone, 8 števk)
  taxNumber: "12345678",
  // Oznaka poslovnega prostora
  businessPremiseID: "PREVOZ11",
  // Oznaka elektronske naprave (blagajne)
  electronicDeviceID: "BLAG01",
  // Ime izdajatelja
  name: "Gostilna Pri Marku, d.o.o.",
  naslov: "Glavni trg 1",
  posta: "1000",
  kraj: "Ljubljana",
};

// Demo RSA zasebni ključ (2048-bit) — v produkciji pride iz FURS certifikata (.p12)
let demoPrivateKey: crypto.KeyObject | null = null;

function getPrivateKey(): crypto.KeyObject {
  if (demoPrivateKey) return demoPrivateKey;
  const envKey = process.env.FURS_PRIVATE_KEY;
  if (envKey) {
    demoPrivateKey = crypto.createPrivateKey({
      key: Buffer.from(envKey, "base64"),
      format: "pem" as const,
    });
    return demoPrivateKey;
  }
  // Generiraj demo ključ (prvič) — v produkciji tega NE počnemo
  demoPrivateKey = crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048,
  }).privateKey;
  return demoPrivateKey;
}

// ============================================================================
// POMOŽNE FUNKCIJE
// ============================================================================

export interface InvoiceItem {
  name: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
}

export interface InvoiceParams {
  invoiceNumber: number;
  issueDateTime: Date;
  zoi: string;
  items: InvoiceItem[];
  paymentMethod: "cash" | "card";
  operator: string;
  referenceInvoice?: { number: string; zoi: string };
}

function totalVat(items: InvoiceItem[]): number {
  return items.reduce(
    (s, it) => s + it.unitPrice * it.quantity * it.vatRate,
    0
  );
}

function totalGross(items: InvoiceItem[]): number {
  return items.reduce((s, it) => s + it.unitPrice * it.quantity, 0);
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// ============================================================================
// FORMATIRANJE DATUMA/ČASA (po FURS specifikaciji)
// ============================================================================

export function formatDateFURS(d: Date): string {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

export function formatTimeFURS(d: Date): string {
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${hh}:${mi}:${ss}`;
}

export function formatDateTimeISO(d: Date): string {
  const tz = -d.getTimezoneOffset();
  const sign = tz >= 0 ? "+" : "-";
  const tzH = String(Math.floor(Math.abs(tz) / 60)).padStart(2, "0");
  const tzM = String(Math.abs(tz) % 60).padStart(2, "0");
  const iso =
    d.getFullYear() +
    "-" +
    String(d.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(d.getDate()).padStart(2, "0") +
    "T" +
    String(d.getHours()).padStart(2, "0") +
    ":" +
    String(d.getMinutes()).padStart(2, "0") +
    ":" +
    String(d.getSeconds()).padStart(2, "0");
  return `${iso}${sign}${tzH}:${tzM}`;
}

// ============================================================================
// ZOI — Zaščitna oznaka izdajatelja
// ============================================================================

/**
 * Izračun ZOI po FURS specifikaciji.
 *
 * Postopek:
 * 1. Sestavi niz: davčnaŠt + datum + ura + zaporednaŠt + oznakaPP + oznakaEN + šifraRR
 * 2. RSA podpiši niz (SHA256 + PKCS#1 v1.5)
 * 3. MD5 hash podpisa → 32 hex znakov = ZOI
 */
export function calculateZOI(params: {
  taxNumber: string;
  issueDate: Date;
  invoiceNumber: number;
  businessPremiseID: string;
  electronicDeviceID: string;
}): string {
  const dateStr = formatDateFURS(params.issueDate);
  const timeStr = formatTimeFURS(params.issueDate);
  const invoiceNumStr = String(params.invoiceNumber).padStart(10, "0");

  const input =
    params.taxNumber +
    dateStr +
    timeStr +
    invoiceNumStr +
    params.businessPremiseID +
    params.electronicDeviceID +
    "RR";

  const signer = crypto.createSign("RSA-SHA256");
  signer.update(input, "utf8");
  const signature = signer.sign(getPrivateKey());

  const zoi = crypto.createHash("md5").update(signature).digest("hex");
  return zoi.toUpperCase();
}

// ============================================================================
// EOR — Enkratna identifikacija računa
// ============================================================================

/**
 * V produkciji: vrne FURS REST API po uspešni oddaji XML-a.
 * V demo: generiramo UUID v4 v FURS-ustreznem formatu (UUID brez črt, UPPER).
 */
export function generateEOR(): string {
  return crypto.randomUUID().toUpperCase().replace(/-/g, "");
}

// ============================================================================
// XML RAČUN (po FURS specifikaciji)
// ============================================================================

/**
 * Generira XML za FURS račun (Invoice ali Storno).
 * Struktura sledi FURS eBusiness shemi (fu:Invoice).
 */
export function buildInvoiceXml(params: InvoiceParams): string {
  const isStorno = !!params.referenceInvoice;

  // DDV po stopnjah (agregirano)
  const vatBuckets = new Map<
    number,
    { base: number; vat: number; gross: number }
  >();
  for (const it of params.items) {
    const lineGross = it.unitPrice * it.quantity;
    const lineVat = lineGross * it.vatRate;
    const lineBase = lineGross - lineVat;
    const existing = vatBuckets.get(it.vatRate);
    if (existing) {
      existing.base += lineBase;
      existing.vat += lineVat;
      existing.gross += lineGross;
    } else {
      vatBuckets.set(it.vatRate, { base: lineBase, vat: lineVat, gross: lineGross });
    }
  }

  const gross = totalGross(params.items);
  const vat = totalVat(params.items);
  const taxable = gross - vat;

  const vatLines = Array.from(vatBuckets.entries())
    .map(([rate, v]) => {
      const vatPercent = (rate * 100).toFixed(1);
      return `        <taxRate>
          <VAT>
            <amount>${v.vat.toFixed(2)}</amount>
            <rate>${vatPercent}</rate>
          </VAT>
          <taxableAmount>${v.base.toFixed(2)}</taxableAmount>
          <taxAmount>${v.vat.toFixed(2)}</taxAmount>
        </taxRate>`;
    })
    .join("\n");

  const refInvoiceBlock = isStorno
    ? `
      <ReferenceInvoice>
        <InvoiceNumber>${escapeXml(
          params.referenceInvoice!.number
        )}</InvoiceNumber>
        <ZOI>${params.referenceInvoice!.zoi}</ZOI>
      </ReferenceInvoice>`
    : "";

  const subseqSeq = isStorno ? `<SubsequentSeq>1</SubsequentSeq>` : "";
  const invoiceNumberStr = buildInvoiceNumber(params.invoiceNumber);

  return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="http://www.fu.gov.si/FURS">
  <Header>
    <MessageID>${crypto.randomUUID()}</MessageID>
    <DateTime>${formatDateTimeISO(params.issueDateTime)}</DateTime>
  </Header>
  <InvoiceBody>
    <Content>
      <InvoiceNumber>${invoiceNumberStr}</InvoiceNumber>
      <IssueDateTime>${formatDateTimeISO(params.issueDateTime)}</IssueDateTime>
      <Period>${params.issueDateTime.getFullYear()}</Period>
      <TypeOfInvoice>${isStorno ? "STORNO" : "INVOICE"}</TypeOfInvoice>
      ${subseqSeq}
      <Issuer>
        <VATTaxNumber>${ISSUER.taxNumber}</VATTaxNumber>
        <Name>${escapeXml(ISSUER.name)}</Name>
        <Address>
          <Street>${escapeXml(ISSUER.naslov)}</Street>
          <PostalCode>${ISSUER.posta}</PostalCode>
          <City>${escapeXml(ISSUER.kraj)}</City>
        </Address>
        <BusinessPremiseID>${ISSUER.businessPremiseID}</BusinessPremiseID>
        <ElectronicDeviceID>${ISSUER.electronicDeviceID}</ElectronicDeviceID>
      </Issuer>
      <Operator>
        <VATTaxNumber>${ISSUER.taxNumber}</VATTaxNumber>
        <Name>${escapeXml(params.operator)}</Name>
      </Operator>
      ${refInvoiceBlock}
      <InvoiceLines>
        ${params.items
          .map(
            (it, i) => `        <InvoiceLine>
          <LineNumber>${i + 1}</LineNumber>
          <ItemName>${escapeXml(it.name)}</ItemName>
          <Quantity>${it.quantity.toFixed(3)}</Quantity>
          <Unit>${escapeXml("kos")}</Unit>
          <Price>${it.unitPrice.toFixed(2)}</Price>
          <VAT>
            <rate>${(it.vatRate * 100).toFixed(1)}</rate>
          </VAT>
          <LineAmount>${(it.unitPrice * it.quantity).toFixed(2)}</LineAmount>
        </InvoiceLine>`
          )
          .join("\n")}
      </InvoiceLines>
      <Taxes>
${vatLines}
      </Taxes>
      <InvoiceAmount>
        <TaxableAmount>${taxable.toFixed(2)}</TaxableAmount>
        <TaxAmount>${vat.toFixed(2)}</TaxAmount>
        <TotalAmount>${gross.toFixed(2)}</TotalAmount>
      </InvoiceAmount>
      <Payment>
        <Type>${params.paymentMethod === "card" ? "CARD" : "CASH"}</Type>
        <Amount>${gross.toFixed(2)}</Amount>
      </Payment>
      <ProtectedID>${params.zoi}</ProtectedID>
    </Content>
  </InvoiceBody>
</Invoice>`;
}

// ============================================================================
// QR KODA (FURS format)
// ============================================================================

/**
 * Vsebina QR kode po FURS specifikaciji:
 * ZOI(32) + datum(YYYYMMDDHHMMSS) + davčna(8) + kontrolna(1)
 */
export function buildQrPayload(
  zoi: string,
  issueDate: Date,
  taxNumber: string
): string {
  const d = issueDate;
  const datePart =
    d.getFullYear() +
    String(d.getMonth() + 1).padStart(2, "0") +
    String(d.getDate()).padStart(2, "0") +
    String(d.getHours()).padStart(2, "0") +
    String(d.getMinutes()).padStart(2, "0") +
    String(d.getSeconds()).padStart(2, "0");

  const sum = zoi.split("").reduce((s, c) => s + c.charCodeAt(0), 0);
  const control = sum % 10;

  return zoi + datePart + taxNumber + String(control);
}

// ============================================================================
// ŠTEVILKA RAČUNA (FURS format: PP-EN-ŠT)
// ============================================================================

export function buildInvoiceNumber(seq: number): string {
  return `${ISSUER.businessPremiseID}-${ISSUER.electronicDeviceID}-${String(
    seq
  ).padStart(10, "0")}`;
}
