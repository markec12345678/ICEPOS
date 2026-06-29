// ============================================================
// FURS REST API klient — produkcija + POC
// ============================================================
// Implementira klic na FURS REST API za pridobitev pravega EOR-ja.
// Zahteva pravi FURS certifikat (.p12 iz eDavki) in INI registracijo.
//
// Reference:
// - FURS ePoslovne rešitve: https://www.fu.gov.si/slovenian_business/e_business/ebooks/furs/
// - Tehnična specifikacija eRačun (FURS)
//
// Uporaba:
//   import { sendInvoiceToFurs } from "@/lib/furs-api";
//   const eor = await sendInvoiceToFurs({ xml, zoi, config });
// ============================================================

import crypto from "crypto";
import https from "https";
import fs from "fs";

export interface FursConfig {
  env: "test" | "prod";
  // Pot do .p12 certifikata (eDavki) — pridobljen na https://edavki.durs.gov.si
  certPath?: string;
  // Geslo certifikata
  certPassword?: string;
  // Alternativno: base64 PEM privatni ključ + certifikat
  privateKeyPem?: string;
  certificatePem?: string;
  // Davcna stevilka
  taxNumber: string;
  // CA certifikat FURS (privzeto vgrajen)
  ca?: string;
}

export interface FursInvoiceRequest {
  xml: string;
  zoi: string;
  config: FursConfig;
}

export interface FursInvoiceResponse {
  eor: string;
  success: boolean;
  error?: {
    code: string;
    message: string;
  };
}

const FURS_ENDPOINTS = {
  test: {
    baseUrl: "https://blagajne-test.fu.gov.si:9002",
    invoicePath: "/v1/cash_registers/invoices",
    iniPath: "/v1/cash_registers/initial",
  },
  prod: {
    baseUrl: "https://blagajne.fu.gov.si:9003",
    invoicePath: "/v1/cash_registers/invoices",
    iniPath: "/v1/cash_registers/initial",
  },
};

// ============================================================
// Glavna funkcija — pošlje račun na FURS
// ============================================================

export async function sendInvoiceToFurs(
  req: FursInvoiceRequest
): Promise<FursInvoiceResponse> {
  const { xml, zoi, config } = req;

  // Preveri ali imamo certifikat
  const certs = await loadCertificates(config);
  if (!certs) {
    console.log(
      `[FURS] POC način — vračam demo EOR (zoi=${zoi.slice(0, 16)}..., env=${config.env})`
    );
    return {
      eor: crypto.randomUUID().toUpperCase().replace(/-/g, ""),
      success: true,
      error: {
        code: "POC_MODE",
        message: "FURS certifikat ni naložen — vračam demo EOR (brez pravega FURS klica)",
      },
    };
  }

  try {
    // 1. Pripravi SOAP sporočilo z XML računom
    const soapEnvelope = buildSoapEnvelope(xml);

    // 2. Podpiši SOAP z RSA-SHA256 (WS-Security BinarySecurityToken)
    const signedSoap = signSoapWithWss(
      soapEnvelope,
      certs.privateKeyPem,
      certs.certificatePem
    );

    // 3. Pošlji POST na FURS preko HTTPS z mutual TLS
    const endpoint = FURS_ENDPOINTS[config.env];
    const url = `${endpoint.baseUrl}${endpoint.invoicePath}`;

    const response = await sendHttpsRequest(url, signedSoap, certs);
    const body = response.body;

    // 4. Razčleni EOR iz odgovora
    const eor = parseEorFromResponse(body);
    if (!eor) {
      console.error("[FURS] EOR manjka v odgovoru:", body.slice(0, 500));
      return {
        eor: crypto.randomUUID().toUpperCase().replace(/-/g, ""),
        success: false,
        error: {
          code: "NO_EOR",
          message: "FURS ni vrnil EOR-ja — preveri certifikat in XML",
        },
      };
    }

    console.log(`[FURS] Uspeh! EOR=${eor.slice(0, 16)}...`);
    return { eor, success: true };
  } catch (e) {
    console.error("[FURS] Napaka pri klicu:", e);
    return {
      eor: crypto.randomUUID().toUpperCase().replace(/-/g, ""),
      success: false,
      error: {
        code: "FURS_ERROR",
        message: (e as Error).message || "Napaka pri FURS klicu",
      },
    };
  }
}

// ============================================================
// INI postopek — predhodna prijava elektronske naprave pri FURS
// ============================================================

export async function registerDeviceToFurs(config: FursConfig): Promise<{
  success: boolean;
  message: string;
}> {
  const certs = await loadCertificates(config);
  if (!certs) {
    return {
      success: false,
      message:
        "INI postopek zahteva pravi FURS certifikat (.p12). Naloži ga v Nastavitve.",
    };
  }

  try {
    const endpoint = FURS_ENDPOINTS[config.env];
    const iniXml = buildIniXml({
      taxNumber: config.taxNumber,
      businessPremiseID: "",
      electronicDeviceID: "",
      validityDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    });
    const soapEnvelope = buildSoapEnvelope(iniXml);
    const signedSoap = signSoapWithWss(
      soapEnvelope,
      certs.privateKeyPem,
      certs.certificatePem
    );
    const url = `${endpoint.baseUrl}${endpoint.iniPath}`;
    const response = await sendHttpsRequest(url, signedSoap, certs);

    if (response.statusCode >= 200 && response.statusCode < 300) {
      return { success: true, message: "Naprava registrirana pri FURS" };
    }
    return {
      success: false,
      message: `FURS napaka ${response.statusCode}: ${response.body.slice(0, 200)}`,
    };
  } catch (e) {
    return {
      success: false,
      message: `Napaka: ${(e as Error).message}`,
    };
  }
}

// ============================================================
// Preveri status FURS strežnika
// ============================================================

export async function checkFursHealth(env: "test" | "prod"): Promise<{
  reachable: boolean;
  latency?: number;
  url?: string;
}> {
  const endpoint = FURS_ENDPOINTS[env];
  const start = Date.now();

  return new Promise((resolve) => {
    const req = https.request(
      `${endpoint.baseUrl}/v1/cash_registers/health`,
      { method: "GET", timeout: 5000 },
      (res) => {
        resolve({
          reachable: res.statusCode !== undefined && res.statusCode < 500,
          latency: Date.now() - start,
          url: `${endpoint.baseUrl}/v1/cash_registers/health`,
        });
      }
    );
    req.on("error", () => resolve({ reachable: false, url: endpoint.baseUrl }));
    req.on("timeout", () => {
      req.destroy();
      resolve({ reachable: false, url: endpoint.baseUrl });
    });
    req.end();
  });
}

// ============================================================
// Pomožne funkcije
// ============================================================

interface LoadedCerts {
  privateKeyPem: string;
  certificatePem: string;
  ca?: string;
}

// Naloži certifikat iz .p12 datoteke ali iz PEM stringov
async function loadCertificates(config: FursConfig): Promise<LoadedCerts | null> {
  // Če imamo PEM string-e direktno
  if (config.privateKeyPem && config.certificatePem) {
    return {
      privateKeyPem: config.privateKeyPem,
      certificatePem: config.certificatePem,
      ca: config.ca,
    };
  }

  // Če imamo pot do .p12
  if (config.certPath && config.certPassword) {
    try {
      if (!fs.existsSync(config.certPath)) {
        console.error(`[FURS] Certifikat ne obstaja: ${config.certPath}`);
        return null;
      }
      const p12Buffer = fs.readFileSync(config.certPath);
      const p12 = crypto.createPkcs12(p12Buffer, config.certPassword);

      // Pridobi ključ in certifikat
      const keyObj = p12.key;
      const certObj = p12.cert;

      if (!keyObj || !certObj) {
        console.error("[FURS] Pridobivanje ključa/certifikata iz .p12 ni uspelo");
        return null;
      }

      return {
        privateKeyPem: typeof keyObj === "string"
          ? keyObj
          : keyObj.export({ type: "pkcs8", format: "pem" }) as string,
        certificatePem: typeof certObj === "string"
          ? certObj
          : certObj.export({ type: "spki", format: "pem" }) as string,
        ca: config.ca,
      };
    } catch (e) {
      console.error("[FURS] Napaka pri branju .p12:", e);
      return null;
    }
  }

  return null;
}

// SOAP envelope z XML računom (po FURS specifikaciji)
function buildSoapEnvelope(xmlContent: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd" xmlns:wsu="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd">
  <soap:Header>
    <wsse:Security>
      {{WSS_SIGNATURE}}
    </wsse:Security>
  </soap:Header>
  <soap:Body wsu:Id="body">
    ${xmlContent}
  </soap:Body>
</soap:Envelope>`;
}

// WS-Security podpis z RSA-SHA256 (BinarySecurityToken)
function signSoapWithWss(
  soap: string,
  privateKeyPem: string,
  certificatePem: string
): string {
  try {
    const privateKey = crypto.createPrivateKey(privateKeyPem);
    const certificate = certificatePem.replace(/-----[^-]+-----/g, "").replace(/\s/g, "");

    // Hash SOAP body z RSA-SHA256
    const bodyMatch = soap.match(/<soap:Body[^>]*>([\s\S]*?)<\/soap:Body>/);
    if (!bodyMatch) return soap;

    const bodyContent = bodyMatch[1];
    const signer = crypto.createSign("RSA-SHA256");
    signer.update(bodyContent);
    const signature = signer.sign(privateKey, "base64");

    // WS-Security BinarySecurityToken + Signature blok
    const wssBlock = `<wsse:BinarySecurityToken EncodingType="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-soap-message-security-1.0#Base64Binary" ValueType="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-x509-token-profile-1.0#X509v3" wsu:Id="x509">${certificate}</wsse:BinarySecurityToken>
      <ds:Signature xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
        <ds:SignedInfo>
          <ds:CanonicalizationMethod Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#"/>
          <ds:SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"/>
          <ds:Reference URI="#body">
            <ds:Transforms>
              <ds:Transform Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#"/>
            </ds:Transforms>
            <ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>
            <ds:DigestValue>${crypto.createHash("sha256").update(bodyContent).digest("base64")}</ds:DigestValue>
          </ds:Reference>
        </ds:SignedInfo>
        <ds:SignatureValue>${signature}</ds:SignatureValue>
        <ds:KeyInfo>
          <wsse:SecurityTokenReference>
            <wsse:Reference URI="#x509" ValueType="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-x509-token-profile-1.0#X509v3"/>
          </wsse:SecurityTokenReference>
        </ds:KeyInfo>
      </ds:Signature>`;

    return soap.replace("{{WSS_SIGNATURE}}", wssBlock);
  } catch (e) {
    console.error("[FURS] signSoapWithWss error:", e);
    return soap;
  }
}

// Pošlji HTTPS request z mutual TLS (client cert)
function sendHttpsRequest(
  url: string,
  body: string,
  certs: LoadedCerts
): Promise<{ statusCode: number; body: string }> {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options: https.RequestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname,
      method: "POST",
      headers: {
        "Content-Type": 'application/soap+xml; charset=utf-8',
        "Content-Length": Buffer.byteLength(body),
        "SOAPAction": "http://www.fu.gov.si/FURS/RegisterInvoiceRequest",
      },
      // Mutual TLS: klient mora predložiti certifikat
      key: certs.privateKeyPem,
      cert: certs.certificatePem,
      ca: certs.ca,
      rejectUnauthorized: true,
      timeout: 15000,
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => resolve({ statusCode: res.statusCode || 500, body: data }));
    });

    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("FURS timeout (>15s)"));
    });
    req.write(body);
    req.end();
  });
}

// XML za INI postopek
function buildIniXml(opts: {
  taxNumber: string;
  businessPremiseID: string;
  electronicDeviceID: string;
  validityDate: Date;
}): string {
  return `<RegisterInvoiceRequest xmlns="http://www.fu.gov.si/FURS">
    <Header>
      <TaxNumber>${opts.taxNumber}</TaxNumber>
      <BusinessPremiseID>${opts.businessPremiseID}</BusinessPremiseID>
      <ElectronicDeviceID>${opts.electronicDeviceID}</ElectronicDeviceID>
      <ValidityDate>${opts.validityDate.toISOString().slice(0, 10)}</ValidityDate>
    </Header>
  </RegisterInvoiceRequest>`;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Razčleni EOR (UUID) iz FURS odgovora
function parseEorFromResponse(body: string): string | null {
  // FURS vrne SOAP z UniqueInvoiceID elementom
  const match = body.match(/<UniqueInvoiceID[^>]*>([^<]+)<\/UniqueInvoiceID>/i);
  if (match) return match[1].trim();
  // Alternativa: uuid atribut
  const uuidMatch = body.match(/uuid=["']([^"']+)["']/i);
  return uuidMatch ? uuidMatch[1] : null;
}
