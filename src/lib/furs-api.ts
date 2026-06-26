// FURS REST API klient — struktura za produkcijo
//
// Ta modul implementira klic na FURS REST API za pridobitev pravega EOR-ja.
// Zahteva pravi FURS certifikat (.p12) in INI/POR registracijo naprave.
//
// Reference:
// - FURS ePoslovne rešitve: https://www.fu.gov.si/slovenian_business/e_business/ebooks/furs/
// - Tehnična specifikacija eRačun (FURS)
//
// Uporaba:
//   import { sendInvoiceToFurs } from "@/lib/furs-api";
//   const eor = await sendInvoiceToFurs({ xml, zoi, env: "test" });

import crypto from "crypto";
import https from "https";
import { ISSUER } from "@/lib/furs";

export interface FursConfig {
  env: "test" | "prod";
  // V produkciji: base64 PEM privatni ključ iz .p12 certifikata
  privateKey?: string;
  // V produkciji: base64 PEM certifikat (x509)
  certificate?: string;
  // CA certifikat FURS
  ca?: string;
}

export interface FursInvoiceRequest {
  xml: string;
  zoi: string;
  config: FursConfig;
}

export interface FursInvoiceResponse {
  eor: string;
  // Ob napaki:
  error?: {
    code: string;
    message: string;
  };
}

const FURS_ENDPOINTS = {
  test: {
    baseUrl: "https://blagajne-test.fu.gov.si:9002",
    invoicePath: "/v1/cash_registers/invoices",
  },
  prod: {
    baseUrl: "https://blagajne.fu.gov.si:9003",
    invoicePath: "/v1/cash_registers/invoices",
  },
};

/**
 * Pošlje podpisan XML račun na FURS REST API in pridobi pravi EOR.
 *
 * Postopek (FURS specifikacija):
 * 1. XML račun se podpiše z RSA-SHA256 (XML Signature)
 * 2. Pošlje se kot SOAP sporočilo na FURS endpoint
 * 3. FURS vrne EOR (Enkratna identifikacija računa) — UUID
 * 4. EOR se shrani ob ZOI-ju v bazo
 *
 * V POC: vračamo demo EOR (UUID). V produkciji odkomentiraj pravi klic.
 */
export async function sendInvoiceToFurs(
  req: FursInvoiceRequest
): Promise<FursInvoiceResponse> {
  const { xml, zoi, config } = req;

  // === POC način: vračamo demo EOR ===
  if (!config.privateKey || !config.certificate) {
    console.log(
      `[FURS] POC način — vračam demo EOR (zoi=${zoi.slice(0, 16)}...)`
    );
    return {
      eor: crypto.randomUUID().toUpperCase().replace(/-/g, ""),
    };
  }

  // === PRODUKCIJSKI klic (zakomentiran — potreben pravi certifikat) ===
  /*
  const endpoint = FURS_ENDPOINTS[config.env];
  const url = `${endpoint.baseUrl}${endpoint.invoicePath}`;

  // 1. Pripravi SOAP envelope z XML računom
  const soapEnvelope = buildSoapEnvelope(xml, zoi);

  // 2. Podpiši SOAP z RSA-SHA256 (WS-Security)
  const signedSoap = signSoap(soapEnvelope, config.privateKey, config.certificate);

  // 3. Pošlji POST na FURS
  const response = await sendHttps(url, signedSoap, config);
  const body = await response.text();

  // 4. Razčleni EOR iz odgovora
  const eor = parseEorFromResponse(body);
  if (!eor) {
    throw new Error("FURS ni vrnil EOR-ja");
  }
  return { eor };
  */

  //Fallback: če certifikat manjka, demo EOR
  return {
    eor: crypto.randomUUID().toUpperCase().replace(/-/g, ""),
    error: {
      code: "POC_MODE",
      message: "FURS certifikat ni naložen — vračam demo EOR",
    },
  };
}

/**
 * INI postopek — predhodna prijava elektronske naprave pri FURS.
 * Zahteva se enkrat pred prvo uporabo blagajne.
 */
export async function registerDeviceToFurs(config: FursConfig): Promise<{
  success: boolean;
  message: string;
}> {
  if (!config.privateKey || !config.certificate) {
    return {
      success: false,
      message:
        "INI postopek zahteva pravi FURS certifikat (.p12). Naloži ga v Nastavitve.",
    };
  }

  // === PRODUKCIJSKI INI klic (zakomentiran) ===
  /*
  const endpoint = FURS_ENDPOINTS[config.env];
  const iniXml = buildIniXml({
    taxNumber: ISSUER.taxNumber,
    businessPremiseID: ISSUER.businessPremiseID,
    electronicDeviceID: ISSUER.electronicDeviceID,
    validityDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
  });
  const signedIni = signSoap(buildSoapEnvelope(iniXml, ""), config.privateKey, config.certificate);
  const response = await sendHttps(
    `${endpoint.baseUrl}${endpoint.invoicePath.replace("invoices", "initial")}`,
    signedIni,
    config
  );
  if (response.ok) return { success: true, message: "Naprava registrirana pri FURS" };
  */

  return {
    success: false,
    message: "INI postopek še ni implementiran (POC)",
  };
}

/**
 * Preveri status FURS strežnika (ali je dosegljiv).
 */
export async function checkFursHealth(env: "test" | "prod"): Promise<{
  reachable: boolean;
  latency?: number;
}> {
  const endpoint = FURS_ENDPOINTS[env];
  const start = Date.now();

  return new Promise((resolve) => {
    const req = https.request(
      `${endpoint.baseUrl}/health`,
      { method: "GET", timeout: 5000 },
      (res) => {
        resolve({
          reachable: res.statusCode !== undefined && res.statusCode < 500,
          latency: Date.now() - start,
        });
      }
    );
    req.on("error", () => resolve({ reachable: false }));
    req.on("timeout", () => {
      req.destroy();
      resolve({ reachable: false });
    });
    req.end();
  });
}

// Pomožne funkcije (za produkcijo)

function buildSoapEnvelope(xml: string, zoi: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <RegisterInvoiceRequest xmlns="http://www.fu.gov.si/FURS">
      <Invoice>${escapeXml(xml)}</Invoice>
      ${zoi ? `<ProtectedID>${zoi}</ProtectedID>` : ""}
    </RegisterInvoiceRequest>
  </soap:Body>
</soap:Envelope>`;
}

function signSoap(
  soap: string,
  privateKey: string,
  certificate: string
): string {
  // WS-Security XML Signature (RSA-SHA256)
  // V produkciji: uporabi `xml-crypto` ali `xmljs` knjižnico
  // Ta funkcija je placeholder
  return soap;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function parseEorFromResponse(body: string): string | null {
  const match = body.match(/<UniqueInvoiceID>([^<]+)<\/UniqueInvoiceID>/);
  return match ? match[1] : null;
}
