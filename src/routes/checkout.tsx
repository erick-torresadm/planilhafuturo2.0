import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import {
  Check, Copy, Crown, Loader2, ArrowRight, CreditCard, QrCode, ChevronLeft, ArrowLeft,
  ShieldCheck, Sparkles, BadgeCheck, RefreshCcw, Mail,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/checkout")({
  validateSearch: (search: Record<string, string | undefined>) => ({
    plan: (search.plan as "anual" | "vitalicio" | undefined) ?? "anual",
  }),
  head: () => ({
    meta: [
      { title: "Assinar — planilhafuturo" },
      { name: "description", content: "Escolha seu plano e comece a organizar suas finanças." },
    ],
  }),
  component: CheckoutPage,
});

const PLANOS = {
  anual: { nome: "PRO Anual", valor: 250, detalhe: "R$ 21/mês", badge: "Mais escolhido", beneficio: "Projeção de 12 meses + IA" },
  vitalicio: { nome: "Vitalício", valor: 450, detalhe: "Única parcela · pra sempre", badge: "Melhor custo-benefício", beneficio: "Acesso pra sempre + atualizações" },
} as const;

/**
 * Ambiente do tokenizador do cartão. Precisa bater com o ambiente da API Efí:
 * homologação usa sandbox, produção usa production. Lê VITE_EFI_ENV (baked no
 * build); sem ele, segue o modo dev.
 */
function efiTokenizerEnv(): "sandbox" | "production" {
  const e = (import.meta.env.VITE_EFI_ENV as string | undefined) ?? (import.meta.env.DEV ? "homologacao" : "producao");
  return e === "producao" || e === "prod" ? "production" : "sandbox";
}

function CheckoutPage() {
  const { plan: planParam } = Route.useSearch();
  const nav = useNavigate();

  const [plano, setPlano] = useState<"anual" | "vitalicio">(planParam);
  const [email, setEmail] = useState("");
  const [metodo, setMetodo] = useState<"pix" | "cartao">("pix");
  const [step, setStep] = useState<"form" | "pix_qr" | "card_result" | "done">("form");

  // Pix state
  const [pixData, setPixData] = useState<{ txid: string; pixCopiaECola: string; qrcode: string; valor: number } | null>(null);
  const [copied, setCopied] = useState(false);

  // Card form state
  const [cardNome, setCardNome] = useState("");
  const [cardCpf, setCardCpf] = useState("");
  const [cardNumero, setCardNumero] = useState("");
  const [cardValidade, setCardValidade] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [cardPhone, setCardPhone] = useState("");

  // General state
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");

  const planInfo = PLANOS[plano];

  function formatCardNumber(val: string) {
    const digits = val.replace(/\D/g, "").slice(0, 16);
    return digits.replace(/(\d{4})(?=\d)/g, "$1 ");
  }

  function formatCpf(val: string) {
    const digits = val.replace(/\D/g, "").slice(0, 11);
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  }

  function formatValidade(val: string) {
    const digits = val.replace(/\D/g, "").slice(0, 4);
    if (digits.length > 2) return digits.slice(0, 2) + "/" + digits.slice(2);
    return digits;
  }

  function formatPhone(val: string) {
    const digits = val.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 2) return `(${digits}`;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }

  function luhnCheck(card: string): boolean {
    const digits = card.replace(/\D/g, "");
    if (digits.length < 13) return false;
    let sum = 0;
    let alternate = false;
    for (let i = digits.length - 1; i >= 0; i--) {
      let n = parseInt(digits[i], 10);
      if (alternate) {
        n *= 2;
        if (n > 9) n -= 9;
      }
      sum += n;
      alternate = !alternate;
    }
    return sum % 10 === 0;
  }

  /** Dynamically load Efí's payment-token-efi lib (UMD exposes window.EfiPay) */
  function loadEfiPayLib(): Promise<any> {
    return new Promise((resolve, reject) => {
      const w = window as any;
      if (w.EfiPay) return resolve(w.EfiPay);
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/gh/efipay/js-payment-token-efi/dist/payment-token-efi-umd.min.js";
      s.onload = () => resolve(w.EfiPay);
      s.onerror = () => reject(new Error("Não foi possível carregar o processador de pagamento."));
      document.head.appendChild(s);
    });
  }

  async function handlePagarPix() {
    if (!email.trim()) { setError("Digite seu email"); return; }
    setError("");
    setLoading(true);
    try {
      const m = await import("@/lib/assinatura.functions");
      const result = await m.createPreSignupCheckout({ data: { email: email.trim(), plano, metodo: "pix" } });
      if (result.ok) {
        setPixData(result);
        setStep("pix_qr");
      } else {
        setError(result.error);
        toast.error(result.error);
      }
    } catch (e: any) {
      setError(e.message ?? "Erro ao gerar Pix");
      toast.error(e.message ?? "Erro ao gerar Pix");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerificarPix() {
    if (!pixData) return;
    setVerifying(true);
    try {
      const m = await import("@/lib/assinatura.functions");
      const result = await m.verifyPreSignupPayment({ data: { email: email.trim(), txid: pixData.txid } });
      if (result.paid) {
        setStep("done");
        toast.success("Pagamento confirmado!");
      } else {
        toast.error(result.error || "Pagamento não confirmado. Tente novamente.");
      }
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao verificar");
    } finally {
      setVerifying(false);
    }
  }

  async function handlePagarCartao() {
    if (!email.trim()) { setError("Digite seu email"); return; }
    if (!cardNome.trim()) { setError("Digite o nome no cartão"); return; }
    if (cardCpf.replace(/\D/g, "").length !== 11) { setError("CPF inválido"); return; }
    if (!luhnCheck(cardNumero)) { setError("Número do cartão inválido"); return; }
    if (cardValidade.replace(/\D/g, "").length !== 4) { setError("Data de validade inválida"); return; }
    if (cardCvv.replace(/\D/g, "").length < 3) { setError("CVV inválido"); return; }

    setError("");
    setLoading(true);

    const [mm, yy] = [
      cardValidade.replace(/\D/g, "").slice(0, 2),
      cardValidade.replace(/\D/g, "").slice(2, 4),
    ];

    try {
      // Tokenize the card in the browser (card data never reaches our server)
      const EfiPay = await loadEfiPayLib();
      const payeeCode = import.meta.env.VITE_EFI_PAYEE_CODE as string | undefined;
      if (!payeeCode) {
        setError("Pagamento por cartão ainda não configurado. Use Pix por enquanto.");
        return;
      }
      const brand = await EfiPay.CreditCard.setCardNumber(cardNumero.replace(/\s/g, "")).verifyCardBrand();
      const tokenResult = await EfiPay.CreditCard
        .setAccount(payeeCode)
        .setEnvironment(efiTokenizerEnv())
        .setCreditCardData({
          brand,
          number: cardNumero.replace(/\s/g, ""),
          cvv: cardCvv,
          expirationMonth: mm,
          expirationYear: "20" + yy,
          holderName: cardNome,
          holderDocument: cardCpf.replace(/\D/g, ""),
          reuse: false,
        })
        .getPaymentToken();

      const m = await import("@/lib/assinatura.functions");
      const result = await m.createPreSignupCheckout({
        data: {
          email: email.trim(),
          plano,
          metodo: "cartao",
          paymentToken: tokenResult.payment_token,
          customerName: cardNome,
          customerCpf: cardCpf.replace(/\D/g, ""),
          customerPhone: cardPhone.replace(/\D/g, ""),
        },
      });

      if (result.ok) {
        if (result.paid) {
          setStep("done");
          toast.success("Pagamento aprovado!");
        } else {
          setStep("card_result");
          toast.error(result.message || "Pagamento não aprovado. Tente outro cartão.");
        }
      } else {
        setError(result.error);
        toast.error(result.error);
      }
    } catch (e: any) {
      const msg = e?.error_description ?? e?.error ?? e?.message ?? "Erro ao processar pagamento";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  function copyPixCode() {
    if (pixData) {
      navigator.clipboard.writeText(pixData.pixCopiaECola);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Código Pix copiado!");
    }
  }

  function handleDone() {
    nav({ to: "/auth", search: { email: email.trim(), plan: plano } });
  }

  const inputCls =
    "w-full h-12 px-4 rounded-xl border border-border bg-card text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="h-14 flex items-center px-4 border-b border-border shrink-0">
        {step !== "form" && step !== "done" ? (
          <button onClick={() => setStep("form")} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </button>
        ) : (
          <Link to="/" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ChevronLeft className="h-4 w-4" /> Home
          </Link>
        )}
        <div className="flex-1 flex justify-center">
          <Logo size={18} />
        </div>
        <div className="w-16" />
      </header>

      <div className="flex-1 flex items-start justify-center px-4 py-8">
        <div className="w-full max-w-md space-y-5">

          {/* ─── Step: plan + email + payment ─── */}
          {step === "form" && (
            <>
              {/* Heading */}
              <div className="text-center">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary mb-3">
                  <Crown className="h-3.5 w-3.5" /> Garantia de 7 dias
                </div>
                <h1 className="font-display text-2xl font-bold tracking-tight">Assine o planilhafuturo</h1>
                <p className="text-sm text-muted-foreground mt-1">Pague agora e crie sua conta depois</p>
              </div>

              {/* Plan selector */}
              <div className="grid grid-cols-2 gap-3">
                {(["anual", "vitalicio"] as const).map((p) => {
                  const info = PLANOS[p];
                  const active = plano === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPlano(p)}
                      className={cn(
                        "relative rounded-2xl border-2 p-4 text-left transition-all",
                        active ? "border-primary bg-primary/[0.04] shadow-sm" : "border-border bg-card hover:border-primary/40",
                      )}
                    >
                      {info.badge && (
                        <span className={cn(
                          "absolute -top-2.5 left-3 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                          active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                        )}>
                          {info.badge}
                        </span>
                      )}
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-display text-sm font-bold">{info.nome}</span>
                        <span className={cn(
                          "grid h-5 w-5 place-items-center rounded-full border-2 shrink-0 transition-colors",
                          active ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/30",
                        )}>
                          {active && <Check className="h-3 w-3" strokeWidth={3} />}
                        </span>
                      </div>
                      <div className="mt-1.5 text-2xl font-bold tabular-nums">R$ {info.valor}</div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{info.detalhe}</p>
                    </button>
                  );
                })}
              </div>

              {/* Selected plan summary */}
              <div className="rounded-2xl border border-border bg-card p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 grid place-items-center shrink-0">
                    <Sparkles className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{planInfo.nome}</p>
                    <p className="text-xs text-muted-foreground truncate">{planInfo.beneficio}</p>
                  </div>
                </div>
                <p className="text-lg font-bold tabular-nums shrink-0">R$ {planInfo.valor}</p>
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className={cn(inputCls, "pl-10")}
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Payment method tabs */}
              <div className="flex bg-muted rounded-xl p-1">
                {([
                  { id: "pix" as const, label: "Pix", icon: QrCode },
                  { id: "cartao" as const, label: "Cartão de Crédito", icon: CreditCard },
                ]).map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => { setMetodo(m.id); setError(""); }}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg transition-all",
                      metodo === m.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <m.icon className="h-4 w-4" />
                    {m.label}
                  </button>
                ))}
              </div>

              {/* Error */}
              {error && (
                <div className="rounded-xl bg-negative-soft border border-negative/20 px-4 py-3 text-sm text-negative font-medium">
                  {error}
                </div>
              )}

              {/* Pix: Pay button */}
              {metodo === "pix" && (
                <Button onClick={handlePagarPix} disabled={loading} className="w-full h-12 rounded-xl font-semibold">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <QrCode className="h-4 w-4 mr-2" />}
                  {loading ? "Gerando Pix..." : `Pagar R$ ${planInfo.valor} via Pix`}
                </Button>
              )}

              {/* Credit Card form */}
              {metodo === "cartao" && (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Nome no cartão</label>
                    <input value={cardNome} onChange={(e) => setCardNome(e.target.value)} placeholder="Como está no cartão" className={inputCls} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">CPF do titular</label>
                    <input value={cardCpf} onChange={(e) => setCardCpf(formatCpf(e.target.value))} placeholder="000.000.000-00" className={cn(inputCls, "font-mono")} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Número do cartão</label>
                    <input value={cardNumero} onChange={(e) => setCardNumero(formatCardNumber(e.target.value))} placeholder="0000 0000 0000 0000" className={cn(inputCls, "font-mono")} inputMode="numeric" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Validade</label>
                      <input value={cardValidade} onChange={(e) => setCardValidade(formatValidade(e.target.value))} placeholder="MM/AA" className={cn(inputCls, "font-mono")} inputMode="numeric" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">CVV</label>
                      <input value={cardCvv} onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="000" className={cn(inputCls, "font-mono")} inputMode="numeric" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Telefone <span className="text-muted-foreground/50">(opcional)</span></label>
                    <input value={cardPhone} onChange={(e) => setCardPhone(formatPhone(e.target.value))} placeholder="(11) 99999-9999" className={cn(inputCls, "font-mono")} inputMode="numeric" />
                  </div>
                  <Button onClick={handlePagarCartao} disabled={loading} className="w-full h-12 rounded-xl font-semibold">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CreditCard className="h-4 w-4 mr-2" />}
                    {loading ? "Processando..." : `Pagar R$ ${planInfo.valor} no cartão`}
                  </Button>
                  <p className="text-[10px] text-center text-muted-foreground/60">
                    Pagamento processado via Efí Pagamentos. Dados do cartão trafegam de forma segura.
                  </p>
                </div>
              )}

              {/* Trust row */}
              <div className="flex items-center justify-center gap-4 text-[11px] text-muted-foreground pt-1">
                <span className="flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5" /> Pagamento seguro</span>
                <span className="flex items-center gap-1"><RefreshCcw className="h-3.5 w-3.5" /> Reembolso em 7 dias</span>
              </div>

              <p className="text-xs text-center text-muted-foreground">
                Já tem conta? <Link to="/auth" className="text-primary font-semibold hover:underline">Entrar</Link>
              </p>
            </>
          )}

          {/* ─── Step: Pix QR Code ─── */}
          {step === "pix_qr" && pixData && (
            <div className="text-center space-y-4">
              <div className="h-14 w-14 rounded-2xl bg-primary/10 grid place-items-center mx-auto">
                <QrCode className="h-7 w-7 text-primary" />
              </div>
              <div>
                <h2 className="font-display text-xl font-bold">Pague via Pix</h2>
                <p className="text-sm text-muted-foreground mt-1">Escaneie o QR Code ou copie o código abaixo</p>
                <p className="text-2xl font-bold tabular-nums mt-2 text-primary">R$ {pixData.valor.toFixed(2)}</p>
              </div>

              {pixData.pixCopiaECola && (
                <div className="mx-auto w-64 h-64 rounded-2xl border border-border bg-white p-3 flex items-center justify-center shadow-sm">
                  <QRCodeSVG value={pixData.pixCopiaECola} size={232} level="M" />
                </div>
              )}

              <div className="flex items-center gap-2 bg-muted border border-border rounded-xl p-3 text-xs font-mono">
                <span className="flex-1 truncate">{pixData.pixCopiaECola}</span>
                <button onClick={copyPixCode} className="shrink-0 text-primary hover:text-primary/80">
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>

              <Button onClick={handleVerificarPix} disabled={verifying} className="w-full h-12 rounded-xl font-semibold">
                {verifying ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <BadgeCheck className="h-4 w-4 mr-2" />}
                {verifying ? "Verificando..." : "Já paguei"}
              </Button>

              <p className="text-xs text-muted-foreground">
                Depois de pagar, clique em "Já paguei" para confirmar.
              </p>
            </div>
          )}

          {/* ─── Step: Card result (paid or failed) ─── */}
          {step === "card_result" && (
            <div className="text-center space-y-4">
              <div className="h-14 w-14 rounded-2xl bg-negative/10 grid place-items-center mx-auto">
                <CreditCard className="h-7 w-7 text-negative" />
              </div>
              <div>
                <h2 className="font-display text-xl font-bold">Pagamento não aprovado</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Tente novamente com outro cartão ou escolha Pix.
                </p>
              </div>
              <Button onClick={() => { setStep("form"); setMetodo("pix"); }} variant="outline" className="w-full h-12 rounded-xl">
                <QrCode className="h-4 w-4 mr-2" /> Tentar via Pix
              </Button>
              <Button onClick={() => setStep("form")} className="w-full h-12 rounded-xl">
                Tentar outro cartão
              </Button>
            </div>
          )}

          {/* ─── Step: Done → redirect to auth ─── */}
          {step === "done" && (
            <div className="text-center space-y-4 animate-in">
              <div className="h-16 w-16 rounded-full bg-positive/10 grid place-items-center mx-auto">
                <Check className="h-8 w-8 text-positive" strokeWidth={3} />
              </div>
              <div>
                <h2 className="font-display text-2xl font-bold">Pagamento confirmado!</h2>
                <p className="text-sm text-muted-foreground mt-2">
                  Agora crie sua conta com o email <strong className="text-foreground">{email}</strong> para ativar o plano <strong className="text-foreground">{planInfo.nome}</strong>.
                </p>
              </div>
              <Button onClick={handleDone} className="w-full h-12 rounded-xl font-semibold text-base">
                Criar conta <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
              <p className="text-xs text-muted-foreground">
                Já tem conta? <Link to="/auth" className="text-primary font-semibold hover:underline">Fazer login</Link>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
