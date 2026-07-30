/**
 * Efí Pagamentos API client (server-only).
 * Sandbox mode by default — set EFI_ENDPOINT for production.
 *
 * API docs: https://dev.efipay.com.br/docs/api-pix
 */

const EFI_ENDPOINT = () =>
  process.env.EFI_ENDPOINT ?? "https://sandbox.efipay.com.br";

function getCredentials() {
  const clientId = process.env.EFI_CLIENT_ID;
  const clientSecret = process.env.EFI_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("EFI_CLIENT_ID e EFI_CLIENT_SECRET não configurados");
  }
  return { clientId, clientSecret };
}

let _token: { access: string; expiresAt: number } | null = null;

/** Get OAuth2 access token (cached until expiry) */
async function getAccessToken(): Promise<string> {
  if (_token && Date.now() < _token.expiresAt) return _token.access;

  const { clientId, clientSecret } = getCredentials();
  const basic = btoa(`${clientId}:${clientSecret}`);

  const res = await fetch(`${EFI_ENDPOINT()}/oauth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${basic}`,
    },
    body: JSON.stringify({ grant_type: "client_credentials" }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`EfI auth error (${res.status}): ${err}`);
  }

  const data = await res.json();
  _token = {
    access: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000, // 1min buffer
  };
  return _token.access;
}

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
  const token = await getAccessToken();
  const generatedTxid = txid ?? crypto.randomUUID().replace(/-/g, "").slice(0, 35);

  const body = {
    calendario: { expiracao: 3600 }, // 1 hour
    devedor: { nome: "Planilhafuturo" },
    valor: { original: valor.toFixed(2) },
    chave: process.env.EFI_PIX_KEY ?? "", // Pix key registered in Efí
    solicitacaoPagador: descricao,
  };

  const res = await fetch(
    `${EFI_ENDPOINT()}/v2/cob/${encodeURIComponent(generatedTxid)}`,
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
    throw new Error(`EfI Pix error (${res.status}): ${err}`);
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
  const token = await getAccessToken();

  const res = await fetch(
    `${EFI_ENDPOINT()}/v2/cob/${encodeURIComponent(txid)}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );

  if (res.status === 404) {
    return { status: "NAO_LOCALIZADO", valor: 0 };
  }

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`EfI consult error (${res.status}): ${err}`);
  }

  const data = await res.json();
  return {
    status: data.status,
    valor: parseFloat(data.valor?.original ?? "0"),
  };
}

// ─── Credit Card ───────────────────────────────────────────────

export interface CreditCardDetails {
  card_number: string;
  card_cvv: string;
  card_expiration_month: string;
  card_expiration_year: string;
  card_holder_name: string;
  customer_cpf: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  customer_birth?: string;
  billing_street?: string;
  billing_number?: string;
  billing_neighborhood?: string;
  billing_city?: string;
  billing_state?: string;
  billing_zipcode?: string;
}

export interface CreditCardResult {
  charge_id: number;
  status: string;
  valor: number;
  message?: string;
  code?: number;
}

/**
 * Create a credit card charge via Efí API (one-step).
 * Card details are sent server-side — Efí handles PCI compliance.
 */
export async function createCreditCardCharge(
  valor: number,
  descricao: string,
  card: CreditCardDetails,
  installments: number = 1,
): Promise<CreditCardResult> {
  const token = await getAccessToken();

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
        installments,
        payment_token: null as string | null,
        customer: {
          name: card.customer_name,
          cpf: card.customer_cpf.replace(/\D/g, ""),
          email: card.customer_email,
          phone_number: card.customer_phone ?? "",
          birth: card.customer_birth ?? "",
        },
        billing_address: {
          street: card.billing_street ?? "",
          number: card.billing_number ?? "",
          neighborhood: card.billing_neighborhood ?? "",
          city: card.billing_city ?? "",
          state: card.billing_state ?? "",
          zipcode: card.billing_zipcode ?? "",
        },
      },
    },
  };

  // Efí accepts raw card details in the one-step endpoint
  (body.payment.credit_card as any).card_number = card.card_number.replace(/\D/g, "");
  (body.payment.credit_card as any).card_cvv = card.card_cvv;
  (body.payment.credit_card as any).card_expiration_month = card.card_expiration_month;
  (body.payment.credit_card as any).card_expiration_year = card.card_expiration_year;
  (body.payment.credit_card as any).card_holder_name = card.card_holder_name;

  const res = await fetch(
    `${EFI_ENDPOINT()}/v1/charge/one-step/credit-card`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    },
  );

  const data = await res.json();

  if (!res.ok) {
    return {
      charge_id: 0,
      status: "error",
      valor: 0,
      message: data.message ?? data.error_description ?? `Erro Efí (${res.status})`,
      code: res.status,
    };
  }

  return {
    charge_id: data.charge_id ?? 0,
    status: data.status,
    valor: parseFloat(String(data.valor ?? valor)),
    message: data.message,
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
