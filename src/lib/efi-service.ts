/**
 * Efí Pagamentos API client (server-only).
 *
 * Efí uses two separate APIs with different hosts:
 *  - API Pix (Pix charges):     pix.api.efipay.com.br      (prod) / pix-h.api.efipay.com.br      (homolog)
 *  - API Cobranças (credit card): cobrancas.api.efipay.com.br (prod) / cobrancas-h.api.efipay.com.br (homolog)
 *
 * Both require a mutual-TLS (mTLS) client certificate for every request,
 * including the OAuth token exchange. Provide it via env vars:
 *  - EFI_PFX        (base64-encoded .p12/.pfx certificate)
 *  - EFI_PFX_PASS   (password of the .p12, optional)
 *  - or EFI_CERT + EFI_KEY (PEM cert + PEM private key)
 *
 * API docs: https://dev.efipay.com.br/docs/api-pix
 */

import https from "node:https";

// ─── Environment switch (producao | homologacao) ──────────────
// Set EFI_ENV = "producao" or "homologacao" to pick which set of
// *_PROD / *_HOMOLOG env vars to use. This lets both environments stay
// registered in Vercel and only the switch needs changing.

function efiEnv(): "producao" | "homologacao" {
  const e = (process.env.EFI_ENV ?? "").toLowerCase();
  return e === "producao" || e === "prod" ? "producao" : "homologacao";
}

/** Read the env var for the active environment: EFI_*_PROD or EFI_*_HOMOLOG */
function envOf(prefix: string): string | undefined {
  const suffix = efiEnv() === "producao" ? "PROD" : "HOMOLOG";
  return process.env[`${prefix}_${suffix}`] ?? process.env[prefix];
}

// ─── Endpoints ──────────────────────────────────────────────

export function pixEndpoint(): string {
  return envOf("EFI_PIX_ENDPOINT") ?? "https://pix-h.api.efipay.com.br";
}

export function cobrancasEndpoint(): string {
  return envOf("EFI_COBRANCAS_ENDPOINT") ?? "https://cobrancas-h.api.efipay.com.br";
}

// ─── Credentials ────────────────────────────────────────────

function getCredentials() {
  const clientId = envOf("EFI_CLIENT_ID");
  const clientSecret = envOf("EFI_CLIENT_SECRET");
  if (!clientId || !clientSecret) {
    throw new Error(`EFI_CLIENT_ID e EFI_CLIENT_SECRET não configurados (EFI_ENV=${efiEnv()})`);
  }
  return { clientId, clientSecret };
}

// ─── mTLS agent ─────────────────────────────────────────────

let _agent: https.Agent | null | undefined; // undefined = not resolved yet

/** Build the mTLS https.Agent once. Returns null when no cert is configured. */
function getMtlsAgent(): https.Agent | null {
  if (_agent !== undefined) return _agent;

  const pfx = envOf("EFI_PFX");
  const pass = process.env.EFI_PFX_PASS ?? "";
  const cert = envOf("EFI_CERT");
  const key = envOf("EFI_KEY");

  if (pfx) {
    _agent = new https.Agent({ pfx: Buffer.from(pfx, "base64"), passphrase: pass });
  } else if (cert && key) {
    _agent = new https.Agent({ cert, key });
  } else {
    _agent = null;
  }
  return _agent;
}

/** fetch wrapper that attaches the mTLS client certificate when configured. */
async function efiFetch(url: string, init?: RequestInit): Promise<Response> {
  const agent = getMtlsAgent();
  if (!agent) return fetch(url, init);

  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const headers = new Headers(init?.headers);
    const body = typeof init?.body === "string" ? init.body : undefined;

    const req = https.request(
      {
        hostname: u.hostname,
        port: u.port || 443,
        path: u.pathname + u.search,
        method: init?.method ?? "GET",
        headers: Object.fromEntries(headers.entries()),
        agent,
      },
      (res) => {
        let data = "";
        res.setEncoding("utf8");
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          const status = res.statusCode ?? 0;
          resolve({
            ok: status >= 200 && status < 300,
            status,
            statusText: res.statusMessage ?? "",
            text: () => Promise.resolve(data),
            json: () => Promise.resolve(JSON.parse(data)),
          } as unknown as Response);
        });
      },
    );
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

// ─── OAuth2 tokens (cached; one per API) ────────────────────

let _pixToken: { access: string; expiresAt: number } | null = null;
let _cobToken: { access: string; expiresAt: number } | null = null;

async function getToken(
  cache: { access: string; expiresAt: number } | null,
  endpoint: string,
  oauthPath: string,
): Promise<string> {
  if (cache && Date.now() < cache.expiresAt) return cache.access;

  const { clientId, clientSecret } = getCredentials();
  const basic = btoa(`${clientId}:${clientSecret}`);

  const res = await efiFetch(`${endpoint}${oauthPath}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${basic}`,
    },
    body: JSON.stringify({ grant_type: "client_credentials" }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Efí auth error (${res.status}): ${err.slice(0, 300)}`);
  }

  const data = await res.json();
  const token = {
    access: data.access_token,
    expiresAt: Date.now() + (Number(data.expires_in || 3600) - 60) * 1000, // 1min buffer
  };
  if (endpoint === pixEndpoint()) _pixToken = token;
  else _cobToken = token;
  return token.access;
}

function getPixToken(): Promise<string> {
  return getToken(_pixToken, pixEndpoint(), "/oauth/token");
}

function getCobrancasToken(): Promise<string> {
  return getToken(_cobToken, cobrancasEndpoint(), "/v1/authorize");
}

// ─── Pix ────────────────────────────────────────────────────

export interface PixCharge {
  txid: string;
  pixCopiaECola: string;
  qrcode: string; // base64 PNG
  valor: number;
}

/** Create an immediate Pix charge */
export async function createPixCharge(
  valor: number,
  descricao: string,
  txid?: string,
): Promise<PixCharge> {
  const token = await getPixToken();
  const generatedTxid = txid ?? crypto.randomUUID().replace(/-/g, "").slice(0, 35);

  const body = {
    calendario: { expiracao: 3600 }, // 1 hour
    // devedor is omitted: Efí requires cpf/cnpj if present, and we don't collect it in the Pix flow
    valor: { original: valor.toFixed(2) },
    chave: process.env.EFI_PIX_KEY ?? "", // Pix key registered in Efí
    solicitacaoPagador: descricao,
  };

  const res = await efiFetch(
    `${pixEndpoint()}/v2/cob/${encodeURIComponent(generatedTxid)}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    },
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Efí Pix error (${res.status}): ${err.slice(0, 300)}`);
  }

  const data = await res.json();
  return {
    txid: data.txid ?? generatedTxid,
    pixCopiaECola: data.pixCopiaECola ?? data.qrcode?.pixCopiaECola ?? "",
    qrcode: data.imagemQrcode ?? data.qrcode?.imagemQrcode ?? "",
    valor,
  };
}

export interface PixStatus {
  status: "ATIVA" | "CONCLUIDA" | "REMOVIDA" | "NAO_LOCALIZADO";
  valor: number;
}

/** Check payment status of a Pix charge */
export async function checkPixStatus(txid: string): Promise<PixStatus> {
  const token = await getPixToken();

  const res = await efiFetch(
    `${pixEndpoint()}/v2/cob/${encodeURIComponent(txid)}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );

  if (res.status === 404) {
    return { status: "NAO_LOCALIZADO", valor: 0 };
  }

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Efí consult error (${res.status}): ${err.slice(0, 300)}`);
  }

  const data = await res.json();
  return {
    status: data.status,
    valor: parseFloat(data.valor?.original ?? "0"),
  };
}

// ─── Credit Card ────────────────────────────────────────────

export interface CreditCardRequest {
  /** payment_token generated in the browser by Efí's payment-token-efi lib */
  paymentToken: string;
  customer: {
    name: string;
    cpf: string;
    email: string;
    /** Required by Efí: DDD + number, e.g. "11987654321" (pattern ^[1-9]{2}9?[0-9]{8}$) */
    phone?: string;
    birth?: string;
  };
  /** Required by Efí's one-step: all fields must be non-empty */
  billing?: {
    street?: string;
    number?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    zipcode?: string;
  };
  installments?: number;
}

export interface CreditCardResult {
  charge_id: number;
  status: "paid" | "unpaid" | "error";
  valor: number;
  message?: string;
  code?: number;
}

/**
 * Create a credit card charge via Efí API Cobranças (one-step).
 * Card data never reaches this server — a payment_token generated in the
 * browser (Efí payment-token-efi lib) is used instead.
 */
export async function createCreditCardCharge(
  valor: number,
  descricao: string,
  card: CreditCardRequest,
): Promise<CreditCardResult> {
  const token = await getCobrancasToken();

  // Efí's one-step requires a valid phone (DDD + number) and a complete billing address.
  const phone = (card.customer.phone ?? "").replace(/\D/g, "");
  if (!phone) {
    return { charge_id: 0, status: "error", valor: 0, message: "Telefone é obrigatório para pagamento com cartão.", code: 422 };
  }
  if (!/^[1-9]{2}9?[0-9]{8}$/.test(phone)) {
    return { charge_id: 0, status: "error", valor: 0, message: "Telefone inválido. Use DDD + número (ex: 11 99999-9999).", code: 422 };
  }

  const billing = card.billing ?? {};
  const requiredBilling = ["street", "number", "neighborhood", "city", "state", "zipcode"] as const;
  const missing = requiredBilling.filter((k) => !String(billing[k] ?? "").trim());
  if (missing.length) {
    return {
      charge_id: 0,
      status: "error",
      valor: 0,
      message: `Endereço de cobrança incompleto: ${missing.join(", ")}.`,
      code: 422,
    };
  }

  const body = {
    items: [
      {
        name: descricao,
        value: Math.round(valor * 100), // cents
        amount: 1,
      },
    ],
    payment: {
      credit_card: {
        customer: {
          name: card.customer.name,
          cpf: card.customer.cpf.replace(/\D/g, ""),
          email: card.customer.email,
          phone_number: phone,
          // birth é opcional: se vazio, omitir (a Efí rejeita string vazia "")
          ...(card.customer.birth ? { birth: card.customer.birth } : {}),
        },
        installments: card.installments ?? 1,
        payment_token: card.paymentToken,
        billing_address: {
          street: String(billing.street ?? "").trim(),
          number: String(billing.number ?? "").trim(),
          neighborhood: String(billing.neighborhood ?? "").trim(),
          city: String(billing.city ?? "").trim(),
          state: String(billing.state ?? "").trim(),
          zipcode: String(billing.zipcode ?? "").trim(),
        },
      },
    },
  };

  const res = await efiFetch(`${cobrancasEndpoint()}/v1/charge/one-step`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  const json = (await res.json().catch(() => ({}))) as any;
  const data = json?.data ?? json; // Efí wraps responses in { code, data }

  if (!res.ok) {
    // Efí returns 400/500 validation errors with error_description that may be
    // a string OR an object { property, message }.
    const desc = data?.error_description;
    const detail = typeof desc === "object" && desc !== null && desc.message
      ? `${desc.property ? desc.property + ": " : ""}${desc.message}`
      : desc;
    return {
      charge_id: 0,
      status: "error",
      valor: 0,
      message:
        data?.refusal?.reason ??
        detail ??
        data?.message ??
        `Erro Efí (${res.status})`,
      code: res.status,
    };
  }

  // Efí returns HTTP 200 for both approved and refused transactions
  const rawStatus: string = data?.status ?? "";
  const paid = rawStatus === "approved" || rawStatus === "paid";
  return {
    charge_id: data?.charge_id ?? 0,
    status: paid ? "paid" : "unpaid",
    valor: (Number(data?.total ?? 0) || 0) / 100,
    message: paid ? undefined : data?.refusal?.reason,
  };
}

/** Verify webhook signature (basic — Efí sends token in query params) */
export function verifyWebhook(request: Request): boolean {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  const expected = process.env.EFI_WEBHOOK_TOKEN;
  if (!expected) return true; // no token configured — skip check
  return token === expected;
}
