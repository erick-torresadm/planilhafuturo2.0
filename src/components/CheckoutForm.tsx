import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, Copy, Loader2, CreditCard, QrCode, BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type PixData = { txid: string; pixCopiaECola: string; qrcode: string; valor: number };

export type CheckoutFormProps = {
  valor: number;
  descricao: string;
  onPix: () => Promise<({ ok: true } & PixData) | { ok: false; error: string }>;
  onVerificarPix: (txid: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  onCartao: (p: {
    paymentToken: string;
    customerName: string;
    customerCpf: string;
    customerPhone: string;
    installments: number;
  }) => Promise<{ ok: true; paid: boolean; message?: string } | { ok: false; error: string }>;
  onPago: () => void;
};

function efiTokenizerEnv(): "sandbox" | "production" {
  const e =
    (import.meta.env.VITE_EFI_ENV as string | undefined) ??
    (import.meta.env.DEV ? "homologacao" : "producao");
  return e === "producao" || e === "prod" ? "production" : "sandbox";
}

function formatCardNumber(val: string) {
  return val
    .replace(/\D/g, "")
    .slice(0, 16)
    .replace(/(\d{4})(?=\d)/g, "$1 ");
}
function formatCpf(val: string) {
  return val
    .replace(/\D/g, "")
    .slice(0, 11)
    .replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}
function formatValidade(val: string) {
  const d = val.replace(/\D/g, "").slice(0, 4);
  return d.length > 2 ? d.slice(0, 2) + "/" + d.slice(2) : d;
}
function formatPhone(val: string) {
  const d = val.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}
function detectBrand(numero: string): string {
  const n = numero.replace(/\D/g, "");
  if (/^4/.test(n)) return "visa";
  if (/^5[1-5]/.test(n) || /^2[2-7]/.test(n)) return "mastercard";
  if (/^3[47]/.test(n)) return "amex";
  if (
    /^(636368|438935|504175|451416|509048|509067|509049|509069|509074|509073|509072|509071|509070|627780|636297|506699|506698|506697|506696)/.test(
      n,
    )
  )
    return "elo";
  return "";
}
function luhnCheck(card: string): boolean {
  const digits = card.replace(/\D/g, "");
  if (digits.length < 13) return false;
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = parseInt(digits[i], 10);
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}
function loadEfiPayLib(): Promise<any> {
  return new Promise((resolve, reject) => {
    const w = window as any;
    if (w.EfiPay) return resolve(w.EfiPay);
    const s = document.createElement("script");
    s.src =
      "https://cdn.jsdelivr.net/gh/efipay/js-payment-token-efi/dist/payment-token-efi-umd.min.js";
    s.onload = () => resolve(w.EfiPay);
    s.onerror = () => reject(new Error("Não foi possível carregar o processador de pagamento."));
    document.head.appendChild(s);
  });
}

const inputCls =
  "w-full h-12 px-4 rounded-xl border border-border bg-card text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors";
const brl = (n: number) => `R$ ${n.toFixed(2).replace(".", ",")}`;

export function CheckoutForm({
  valor,
  descricao,
  onPix,
  onVerificarPix,
  onCartao,
  onPago,
}: CheckoutFormProps) {
  const [metodo, setMetodo] = useState<"pix" | "cartao">("pix");
  const [phase, setPhase] = useState<"pagamento" | "pix_qr" | "card_result">("pagamento");
  const [pixData, setPixData] = useState<PixData | null>(null);
  const [copied, setCopied] = useState(false);
  const [cardNome, setCardNome] = useState("");
  const [cardCpf, setCardCpf] = useState("");
  const [cardNumero, setCardNumero] = useState("");
  const [cardValidade, setCardValidade] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [cardPhone, setCardPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");
  const [cardMsg, setCardMsg] = useState("");
  const [parcelasOpts, setParcelasOpts] = useState<
    { installment: number; value: number; has_interest: boolean }[]
  >([]);
  const [parcelas, setParcelas] = useState(1);

  useEffect(() => {
    let cancelled = false;
    const brand = detectBrand(cardNumero);
    if (!brand || cardNumero.replace(/\D/g, "").length < 13) {
      setParcelasOpts([]);
      setParcelas(1);
      return;
    }
    const host =
      efiTokenizerEnv() === "production"
        ? "https://cobrancas.api.efipay.com.br"
        : "https://cobrancas-h.api.efipay.com.br";
    const payee = import.meta.env.VITE_EFI_PAYEE_CODE as string | undefined;
    if (!payee) return;
    fetch(`${host}/v1/installments/${payee}/jsonp?brand=${brand}&total=${Math.round(valor * 100)}`)
      .then((r) => r.json())
      .then((j) => {
        if (cancelled || !j?.data?.installments) return;
        setParcelasOpts(
          j.data.installments.map((x: any) => ({
            installment: x.installment,
            value: x.value,
            has_interest: !!x.has_interest,
          })),
        );
        setParcelas(1);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [cardNumero, valor]);

  async function pagarPix() {
    setError("");
    setLoading(true);
    try {
      const r = await onPix();
      if (r.ok) {
        setPixData(r);
        setPhase("pix_qr");
      } else {
        setError(r.error);
        toast.error(r.error);
      }
    } finally {
      setLoading(false);
    }
  }

  async function verificarPix() {
    if (!pixData) return;
    setVerifying(true);
    try {
      const r = await onVerificarPix(pixData.txid);
      if (r.ok) {
        toast.success("Pagamento confirmado!");
        onPago();
      } else toast.error(r.error);
    } finally {
      setVerifying(false);
    }
  }

  async function pagarCartao() {
    if (!cardNome.trim()) return setError("Digite o nome no cartão");
    if (cardCpf.replace(/\D/g, "").length !== 11) return setError("CPF inválido");
    if (!luhnCheck(cardNumero)) return setError("Número do cartão inválido");
    if (cardValidade.replace(/\D/g, "").length !== 4) return setError("Data de validade inválida");
    if (cardCvv.replace(/\D/g, "").length < 3) return setError("CVV inválido");
    if (cardPhone.replace(/\D/g, "").length < 10)
      return setError("Telefone é obrigatório (DDD + número)");
    setError("");
    setLoading(true);
    const digits = cardValidade.replace(/\D/g, "");
    try {
      const payee = import.meta.env.VITE_EFI_PAYEE_CODE as string | undefined;
      if (!payee) {
        setError("Pagamento por cartão ainda não configurado. Use Pix.");
        return;
      }
      const EfiPay = await loadEfiPayLib();
      const brand = await EfiPay.CreditCard.setCardNumber(
        cardNumero.replace(/\s/g, ""),
      ).verifyCardBrand();
      const tok = await EfiPay.CreditCard.setAccount(payee)
        .setEnvironment(efiTokenizerEnv())
        .setCreditCardData({
          brand,
          number: cardNumero.replace(/\s/g, ""),
          cvv: cardCvv,
          expirationMonth: digits.slice(0, 2),
          expirationYear: "20" + digits.slice(2, 4),
          holderName: cardNome,
          holderDocument: cardCpf.replace(/\D/g, ""),
          reuse: false,
        })
        .getPaymentToken();
      const r = await onCartao({
        paymentToken: tok.payment_token,
        customerName: cardNome,
        customerCpf: cardCpf.replace(/\D/g, ""),
        customerPhone: cardPhone.replace(/\D/g, ""),
        installments: parcelas,
      });
      if (!r.ok) {
        setError(r.error);
        toast.error(r.error);
        return;
      }
      if (r.paid) {
        toast.success("Pagamento aprovado!");
        onPago();
      } else {
        setCardMsg(r.message ?? "");
        setPhase("card_result");
      }
    } catch (e: any) {
      const msg = e?.error_description ?? e?.error ?? e?.message ?? "Erro ao processar pagamento";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  function copyPix() {
    if (!pixData) return;
    navigator.clipboard.writeText(pixData.pixCopiaECola);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Código Pix copiado!");
  }

  if (phase === "pix_qr" && pixData) {
    return (
      <div className="text-center space-y-4">
        <div className="h-14 w-14 rounded-2xl bg-primary/10 grid place-items-center mx-auto">
          <QrCode className="h-7 w-7 text-primary" />
        </div>
        <div>
          <h2 className="font-display text-xl font-bold">Pague via Pix</h2>
          <p className="text-sm text-muted-foreground mt-1">Escaneie o QR Code ou copie o código</p>
          <p className="text-2xl font-bold tabular-nums mt-2 text-primary">{brl(pixData.valor)}</p>
        </div>
        {pixData.pixCopiaECola && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mx-auto w-64 h-64 rounded-2xl border border-border bg-white p-3 flex items-center justify-center"
          >
            <QRCodeSVG value={pixData.pixCopiaECola} size={232} level="M" />
          </motion.div>
        )}
        <div className="flex items-center gap-2 bg-muted border border-border rounded-xl p-3 text-xs font-mono">
          <span className="flex-1 truncate">{pixData.pixCopiaECola}</span>
          <button
            onClick={copyPix}
            aria-label="Copiar código Pix"
            className="h-11 w-11 -m-2 grid place-items-center text-primary"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </button>
        </div>
        <Button
          onClick={verificarPix}
          disabled={verifying}
          className="w-full h-12 rounded-xl font-semibold"
        >
          {verifying ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <BadgeCheck className="h-4 w-4 mr-2" />
          )}
          {verifying ? "Verificando…" : "Já paguei"}
        </Button>
      </div>
    );
  }

  if (phase === "card_result") {
    return (
      <div className="text-center space-y-4">
        <div className="h-14 w-14 rounded-2xl bg-negative/10 grid place-items-center mx-auto">
          <CreditCard className="h-7 w-7 text-negative" />
        </div>
        <h2 className="font-display text-xl font-bold">Pagamento não aprovado</h2>
        {cardMsg && <p className="text-sm text-muted-foreground">{cardMsg}</p>}
        <Button
          variant="outline"
          onClick={() => setPhase("pagamento")}
          className="w-full h-12 rounded-xl"
        >
          Tentar outro cartão ou Pix
        </Button>
      </div>
    );
  }

  const opt = parcelasOpts.find((o) => o.installment === parcelas);
  const totalCartao = opt && parcelas > 1 ? (opt.value * parcelas) / 100 : valor;

  return (
    <div className="space-y-4">
      <div className="flex bg-muted rounded-xl p-1">
        {[
          { id: "pix" as const, label: "Pix", icon: QrCode },
          { id: "cartao" as const, label: "Cartão de Crédito", icon: CreditCard },
        ].map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => {
              setMetodo(m.id);
              setError("");
            }}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg transition-colors",
              metodo === m.id
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <m.icon className="h-4 w-4" /> {m.label}
          </button>
        ))}
      </div>
      {error && (
        <div className="rounded-xl bg-negative-soft border border-negative/20 px-4 py-3 text-sm text-negative font-medium">
          {error}
        </div>
      )}

      {metodo === "pix" &&
        (loading ? (
          <div className="space-y-3">
            <Skeleton className="h-52 w-full rounded-2xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
        ) : (
          <Button onClick={pagarPix} className="w-full h-12 rounded-xl font-semibold">
            <QrCode className="h-4 w-4 mr-2" /> Pagar {brl(valor)} via Pix
          </Button>
        ))}

      {metodo === "cartao" && (
        <div className="space-y-3">
          <label className="block space-y-1.5">
            <span className="eyebrow">Nome no cartão</span>
            <input
              value={cardNome}
              onChange={(e) => setCardNome(e.target.value)}
              autoComplete="cc-name"
              className={inputCls}
            />
          </label>
          <label className="block space-y-1.5">
            <span className="eyebrow">CPF do titular</span>
            <input
              value={cardCpf}
              onChange={(e) => setCardCpf(formatCpf(e.target.value))}
              inputMode="numeric"
              className={cn(inputCls, "font-mono")}
            />
          </label>
          <label className="block space-y-1.5">
            <span className="eyebrow">Número do cartão</span>
            <input
              value={cardNumero}
              onChange={(e) => setCardNumero(formatCardNumber(e.target.value))}
              inputMode="numeric"
              autoComplete="cc-number"
              className={cn(inputCls, "font-mono")}
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1.5">
              <span className="eyebrow">Validade</span>
              <input
                value={cardValidade}
                onChange={(e) => setCardValidade(formatValidade(e.target.value))}
                placeholder="MM/AA"
                inputMode="numeric"
                autoComplete="cc-exp"
                className={cn(inputCls, "font-mono")}
              />
            </label>
            <label className="block space-y-1.5">
              <span className="eyebrow">CVV</span>
              <input
                value={cardCvv}
                onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                inputMode="numeric"
                autoComplete="cc-csc"
                className={cn(inputCls, "font-mono")}
              />
            </label>
          </div>
          {parcelasOpts.length > 0 && (
            <label className="block space-y-1.5">
              <span className="eyebrow">Parcelas</span>
              <select
                value={parcelas}
                onChange={(e) => setParcelas(Number(e.target.value))}
                className={cn(inputCls, "appearance-none")}
              >
                {parcelasOpts.map((o) => (
                  <option key={o.installment} value={o.installment}>
                    {o.installment}x de {brl(o.value / 100)}
                    {o.installment > 1 ? ` (total ${brl((o.value * o.installment) / 100)})` : ""}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="block space-y-1.5">
            <span className="eyebrow">Telefone (com DDD)</span>
            <input
              value={cardPhone}
              onChange={(e) => setCardPhone(formatPhone(e.target.value))}
              inputMode="tel"
              autoComplete="tel"
              className={cn(inputCls, "font-mono")}
            />
          </label>
          <Button
            onClick={pagarCartao}
            disabled={loading}
            className="w-full h-12 rounded-xl font-semibold"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <CreditCard className="h-4 w-4 mr-2" />
            )}
            {loading
              ? "Processando…"
              : parcelas > 1 && opt
                ? `Pagar ${parcelas}x de ${brl(opt.value / 100)} (total ${brl(totalCartao)})`
                : `Pagar ${brl(totalCartao)} no cartão`}
          </Button>
          <p className="text-[10px] text-center text-muted-foreground/60">
            {descricao} · processado pela Efí Pagamentos.
          </p>
        </div>
      )}
    </div>
  );
}
