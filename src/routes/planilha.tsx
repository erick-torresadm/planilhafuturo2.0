import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowRight, Check, Copy, Download, FileSpreadsheet, Loader2, ShieldCheck, Infinity as InfinityIcon, Lock,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/planilha")({
  head: () => ({
    meta: [
      { title: "Planilha do Erick — R$ 70 pra sempre · planilhafuturo" },
      { name: "description", content: "A planilha oficial que o Erick usa, em Excel (.xlsx), R$ 70 pagamento único, sem marca d'água. Download imediato após o Pix confirmar." },
      { property: "og:title", content: "Planilha do Erick — R$ 70 pra sempre" },
      { property: "og:description", content: "Mesma planilha que o Erick usa, sem marca d'água, sem assinatura. Download após confirmação do Pix." },
      { property: "og:type", content: "product" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PlanilhaPage,
});

const BENEFICIOS = [
  "Mesma planilha que o Erick usa",
  "Sem marca d'água, sem assinatura",
  "Formato Excel (.xlsx) — abre em tudo",
  "R$ 70 pagamento único, é sua pra sempre",
  "Fórmulas prontas, é só preencher",
];

function PlanilhaPage() {
  const { user, loading } = useAuth();

  // ── estado da compra ──
  const [pix, setPix] = useState<{ txid: string; pixCopiaECola: string; qrcode: string; valor: number } | null>(null);
  const [loadingCompra, setLoadingCompra] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [paga, setPaga] = useState(false);
  const [baixando, setBaixando] = useState(false);
  const [copied, setCopied] = useState(false);

  async function comprar() {
    setLoadingCompra(true);
    try {
      const m = await import("@/lib/planilha-compra.functions");
      const r = await m.criarCompraPlanilha();
      if (r.ok) setPix(r);
      else toast.error(r.error);
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao gerar Pix");
    } finally {
      setLoadingCompra(false);
    }
  }

  async function verificarPagamento() {
    if (!pix) return;
    setVerifying(true);
    try {
      const m = await import("@/lib/planilha-compra.functions");
      const r = await m.verificarCompraPlanilha({ data: { txid: pix.txid } });
      if (r.ok) {
        toast.success("Pagamento confirmado!");
        setPaga(true);
        setPix(null);
      } else {
        toast.error(r.error);
      }
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao verificar");
    } finally {
      setVerifying(false);
    }
  }

  async function baixar() {
    setBaixando(true);
    try {
      const m = await import("@/lib/planilha-compra.functions");
      const r = await m.baixarPlanilha();
      if (r.ok) {
        const blob = new Blob([Uint8Array.from(atob(r.base64), (c) => c.charCodeAt(0))], { type: r.tipo });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = r.nome;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Download iniciado!");
      } else {
        toast.error(r.error);
      }
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao baixar");
    } finally {
      setBaixando(false);
    }
  }

  function copiarPix() {
    if (!pix) return;
    navigator.clipboard.writeText(pix.pixCopiaECola);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Código Pix copiado!");
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/75 border-b border-border">
        <div className="mx-auto max-w-6xl px-5 sm:px-8 h-16 flex items-center justify-between">
          <Link to="/"><Logo size={28} /></Link>
          <div className="flex items-center gap-2">
            <Link to="/auth" className="hidden sm:inline-flex text-sm text-muted-foreground hover:text-foreground px-3 py-2">
              Entrar
            </Link>
            <Link to="/auth" className="inline-flex items-center gap-1.5 rounded-full mint-gradient px-4 py-2 text-sm font-semibold hover:brightness-110 transition">
              Começar grátis <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero + compra */}
      <main className="mx-auto max-w-6xl px-5 sm:px-8 py-14 sm:py-20">
        <div className="grid lg:grid-cols-2 gap-10 items-start">
          {/* Lado esquerdo: texto */}
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground mb-6">
              <FileSpreadsheet className="h-3.5 w-3.5 text-primary" />
              Planilha oficial do Erick
            </div>
            <h1 className="font-display text-4xl sm:text-5xl leading-tight tracking-tight">
              A planilha que o Erick usa,<br />
              <span className="italic text-primary">por R$ 70 pra sempre.</span>
            </h1>
            <p className="mt-4 text-lg text-muted-foreground max-w-md">
              Versão em Excel (.xlsx), sem marca d'água, sem assinatura. Pague uma vez e é sua.
            </p>
            <ul className="mt-6 space-y-2.5">
              {BENEFICIOS.map((b) => (
                <li key={b} className="flex items-start gap-2.5 text-sm">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-positive-soft text-positive">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                  {b}
                </li>
              ))}
            </ul>
            <div className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-positive" />
              Entrega automática assim que o Pix confirmar
            </div>
          </div>

          {/* Lado direito: card de compra */}
          <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-widest text-muted-foreground">Planilha do Erick</span>
              <span className="chip chip-positive">Pagamento único</span>
            </div>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-4xl font-bold tabular-nums">R$ 70</span>
              <span className="text-sm text-muted-foreground">pra sempre</span>
            </div>

            {paga ? (
              <div className="mt-6 rounded-xl bg-positive-soft border border-positive/20 p-5 text-center space-y-3">
                <Check className="h-8 w-8 text-positive mx-auto" />
                <p className="font-semibold text-positive">Planilha liberada!</p>
                <p className="text-xs text-muted-foreground">Ela é sua pra sempre. Baixe agora:</p>
                <Button onClick={baixar} disabled={baixando} className="w-full">
                  {baixando ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
                  {baixando ? "Baixando..." : "Baixar planilha (.xlsx)"}
                </Button>
              </div>
            ) : pix ? (
              <div className="mt-6 space-y-3 rounded-xl bg-muted p-4 text-center">
                <p className="text-sm font-semibold">Pague R$ 70 via Pix</p>
                {pix.qrcode && <img src={pix.qrcode} alt="QR Code Pix" className="mx-auto w-44 h-44 rounded-xl" />}
                <div className="flex items-center gap-2 bg-card border border-border rounded-xl p-3 text-xs font-mono">
                  <span className="flex-1 truncate">{pix.pixCopiaECola}</span>
                  <button onClick={copiarPix} className="shrink-0 text-primary hover:text-primary/80">
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button onClick={() => setPix(null)} variant="outline" size="sm">Cancelar</Button>
                  <Button onClick={verificarPagamento} disabled={verifying} size="sm">
                    {verifying ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}Já paguei
                  </Button>
                </div>
              </div>
            ) : (
              <div className="mt-6 space-y-3">
                {loading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : user ? (
                  <Button onClick={comprar} disabled={loadingCompra} className="w-full h-11 text-sm font-semibold">
                    {loadingCompra ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileSpreadsheet className="h-4 w-4 mr-2" />}
                    {loadingCompra ? "Gerando Pix..." : "Comprar por R$ 70"}
                  </Button>
                ) : (
                  <Link to="/auth" className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground h-11 text-sm font-semibold hover:brightness-110 transition">
                    <Lock className="h-4 w-4" /> Entrar para comprar
                  </Link>
                )}
                <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
                  Você precisa de uma conta para receber a planilha.
                  <br />O download é liberado automaticamente após o Pix confirmar.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Confiança */}
        <div className="mt-14 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { icon: ShieldCheck, txt: "Compra segura via Pix" },
            { icon: Download, txt: "Download automático" },
            { icon: InfinityIcon, txt: "Válido pra sempre" },
            { icon: FileSpreadsheet, txt: "Formato .xlsx" },
          ].map((f) => (
            <div key={f.txt} className="rounded-xl border border-border bg-card p-4 text-center space-y-2">
              <f.icon className="h-5 w-5 text-primary mx-auto" />
              <p className="text-xs text-muted-foreground">{f.txt}</p>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="mx-auto max-w-6xl px-5 sm:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <div>© {new Date().getFullYear()} planilhafuturo · Planilha do Erick</div>
          <div className="flex flex-wrap gap-x-5 gap-y-1">
            <Link to="/termos" className="hover:text-foreground">Termos</Link>
            <Link to="/privacidade" className="hover:text-foreground">Privacidade</Link>
            <Link to="/cookies" className="hover:text-foreground">Cookies</Link>
            <Link to="/guia" className="hover:text-foreground">Guia</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
