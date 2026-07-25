import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";
import {
  ArrowRight, Eye, EyeOff, Loader2, Mail, Lock, User as UserIcon,
  Check, Sparkles, ShieldCheck, LineChart,
} from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — planilhafuturo" },
      { name: "description", content: "Entre ou crie sua conta na planilhafuturo e enxergue seus próximos 6 meses." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const nav = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Bem-vindo de volta!");
        nav({ to: "/app" });
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/app`,
            data: { nome: name || email.split("@")[0] },
          },
        });
        if (error) throw error;
        toast.success("Se o e-mail for válido, você receberá um link de confirmação.");
        nav({ to: "/onboarding" });
      }
    } catch (err: any) {
      // Mensagem genérica para evitar enumeração de usuários / vazamento de detalhes
      const msg = String(err?.message ?? "").toLowerCase();
      if (msg.includes("rate") || msg.includes("too many")) {
        toast.error("Muitas tentativas. Aguarde alguns minutos e tente novamente.");
      } else if (mode === "login") {
        toast.error("Credenciais inválidas.");
      } else {
        toast.error("Não foi possível concluir o cadastro. Verifique os dados e tente novamente.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function google() {
    setOauthLoading(true);
    try {
      const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
      if (r.error) toast.error(String((r.error as any)?.message ?? r.error));
    } finally {
      setOauthLoading(false);
    }
  }

  const isSignup = mode === "signup";
  const passOk = password.length >= 6;

  return (
    <div className="min-h-svh bg-background text-foreground grid lg:grid-cols-[1.05fr_1fr]">
      {/* ============ Left panel: brand / marketing (desktop only) ============ */}
      <aside className="hidden lg:flex relative overflow-hidden flex-col justify-between p-10 xl:p-14 bg-[oklch(0.22_0.03_250)] text-[oklch(0.97_0.01_90)]">
        {/* subtle grid + glow */}
        <div className="absolute inset-0 opacity-[0.08]" style={{
          backgroundImage: `linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)`,
          backgroundSize: "48px 48px",
        }} />
        <div className="absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-primary/25 blur-[120px]" />
        <div className="absolute -bottom-40 -right-32 h-[420px] w-[420px] rounded-full bg-[oklch(0.6_0.15_165)]/20 blur-[120px]" />

        <div className="relative">
          <Link to="/" className="inline-flex items-center gap-2.5 group">
            <Logo size={30} withWordmark={false} />
            <span className="font-display font-semibold text-lg tracking-[-0.02em]">
              planilha<span className="text-[oklch(0.75_0.15_165)] italic">futuro</span>
            </span>
          </Link>
        </div>

        <div className="relative space-y-8 max-w-lg">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur px-3 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-[oklch(0.85_0.10_165)] ring-1 ring-white/15">
              <Sparkles className="h-3 w-3" /> 6 meses de projeção
            </div>
            <h1 className="font-display text-4xl xl:text-5xl font-semibold leading-[1.05] tracking-[-0.03em]">
              Veja o seu dinheiro <em className="not-italic text-[oklch(0.82_0.14_165)]">antes</em> dele acontecer.
            </h1>
            <p className="text-white/70 text-[15px] leading-relaxed">
              Uma planilha inteligente que projeta seus próximos 6 meses dia a dia. Sem susto no fim do mês.
            </p>
          </div>

          {/* Mini "spreadsheet" preview */}
          <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-white/[0.04] backdrop-blur-sm shadow-2xl">
            <div className="flex items-center gap-1.5 px-3 py-2 border-b border-white/10 bg-white/[0.03]">
              <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-yellow-400/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
              <span className="ml-3 text-[10px] uppercase tracking-widest text-white/50 font-semibold">Fluxo diário</span>
            </div>
            <div className="grid grid-cols-4 text-[11px] font-semibold uppercase tracking-wider text-white/60 border-b border-white/10">
              {["Dia","Entrada","Saída","Saldo"].map((h) => (
                <div key={h} className="px-3 py-2">{h}</div>
              ))}
            </div>
            {[
              { d: "22", i: "3.500", o: "412", s: "8.921", pos: true },
              { d: "23", i: "—",     o: "89",  s: "8.832", pos: true, today: true },
              { d: "24", i: "—",     o: "1.240", s: "7.592", pos: true },
              { d: "25", i: "800",   o: "230", s: "8.162", pos: true },
              { d: "26", i: "—",     o: "3.100", s: "5.062", pos: true },
              { d: "27", i: "—",     o: "6.400", s: "-1.338", pos: false },
            ].map((r) => (
              <div key={r.d} className={`grid grid-cols-4 text-[13px] tabular-nums border-b border-white/[0.06] last:border-0 ${r.today ? "bg-[oklch(0.6_0.15_165)]/15 ring-1 ring-[oklch(0.7_0.15_165)]/40 ring-inset" : ""}`}>
                <div className={`px-3 py-2.5 font-semibold ${r.today ? "text-[oklch(0.85_0.15_165)]" : "text-white/80"}`}>{r.d}{r.today && <span className="ml-1 text-[9px] uppercase tracking-wider">hoje</span>}</div>
                <div className="px-3 py-2.5 text-emerald-300/90">{r.i}</div>
                <div className="px-3 py-2.5 text-rose-300/80">{r.o}</div>
                <div className={`px-3 py-2.5 font-bold ${r.pos ? "text-white" : "text-rose-400"}`}>{r.s}</div>
              </div>
            ))}
          </div>

          <ul className="space-y-2.5">
            {[
              { icon: LineChart, t: "Projeção real dos próximos 6 meses" },
              { icon: ShieldCheck, t: "Seus dados criptografados, só você acessa" },
              { icon: Check, t: "Funciona igual planilha — sem fricção" },
            ].map((it) => (
              <li key={it.t} className="flex items-center gap-3 text-sm text-white/80">
                <span className="h-7 w-7 rounded-lg bg-[oklch(0.6_0.15_165)]/20 grid place-items-center ring-1 ring-[oklch(0.7_0.15_165)]/30">
                  <it.icon className="h-3.5 w-3.5 text-[oklch(0.85_0.14_165)]" />
                </span>
                {it.t}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative text-[11px] text-white/40">
          © {new Date().getFullYear()} planilhafuturo — feito no Brasil.
        </div>
      </aside>

      {/* ============ Right panel: form ============ */}
      <main className="flex flex-col min-h-svh">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center justify-between px-5 pt-6">
          <Link to="/" className="inline-flex items-center gap-2">
            <Logo size={26} withWordmark={false} />
            <span className="font-display font-semibold text-[15px] tracking-[-0.02em]">
              planilha<span className="text-primary italic">futuro</span>
            </span>
          </Link>
          <Link to="/" className="text-xs text-muted-foreground hover:text-foreground">Voltar</Link>
        </header>

        <div className="flex-1 flex items-center justify-center px-5 py-8 sm:py-12">
          <div className="w-full max-w-[400px] space-y-6 fade-up">
            <div className="space-y-2">
              <h2 className="font-display text-2xl sm:text-3xl font-semibold tracking-[-0.02em]">
                {isSignup ? "Crie sua conta" : "Bem-vindo de volta"}
              </h2>
              <p className="text-sm text-muted-foreground">
                {isSignup
                  ? "Comece grátis. Sem cartão de crédito."
                  : "Entre para continuar planejando seus próximos meses."}
              </p>
            </div>

            {/* Segmented tabs */}
            <div className="relative grid grid-cols-2 rounded-lg bg-muted p-1 text-sm font-semibold">
              <div
                className="absolute inset-y-1 w-[calc(50%-4px)] rounded-md bg-card shadow-sm ring-1 ring-border transition-transform"
                style={{ transform: isSignup ? "translateX(calc(100% + 4px))" : "translateX(4px)" }}
              />
              <button
                type="button"
                onClick={() => setMode("login")}
                className={`relative py-2 rounded-md transition-colors ${!isSignup ? "text-foreground" : "text-muted-foreground"}`}
              >
                Entrar
              </button>
              <button
                type="button"
                onClick={() => setMode("signup")}
                className={`relative py-2 rounded-md transition-colors ${isSignup ? "text-foreground" : "text-muted-foreground"}`}
              >
                Criar conta
              </button>
            </div>

            {/* Google */}
            <Button
              type="button"
              variant="outline"
              onClick={google}
              disabled={oauthLoading}
              className="w-full h-11 font-medium border-border hover:bg-accent"
            >
              {oauthLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <GoogleIcon className="h-4 w-4" />
                  Continuar com Google
                </>
              )}
            </Button>

            <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              <div className="flex-1 h-px bg-border" /> ou com email <div className="flex-1 h-px bg-border" />
            </div>

            <form onSubmit={submit} className="space-y-4">
              {isSignup && (
                <div className="space-y-1.5 fade-up">
                  <Label htmlFor="name" className="text-xs font-semibold">Nome</Label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                      id="name" type="text" autoComplete="name"
                      value={name} onChange={(e) => setName(e.target.value)}
                      placeholder="Como você quer ser chamado"
                      className="h-11 pl-9"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-semibold">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="email" type="email" autoComplete="email" required
                    value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="voce@email.com"
                    className="h-11 pl-9"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-xs font-semibold">Senha</Label>
                  {!isSignup && (
                    <button type="button" className="text-[11px] text-muted-foreground hover:text-primary">
                      Esqueci
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="password"
                    type={showPass ? "text" : "password"}
                    autoComplete={isSignup ? "new-password" : "current-password"}
                    required minLength={6}
                    value={password} onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="h-11 pl-9 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((s) => !s)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 grid place-items-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
                    aria-label={showPass ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {isSignup && password.length > 0 && (
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <span className={`h-1.5 flex-1 rounded-full ${passOk ? "bg-primary" : "bg-warning/70"}`} />
                    <span className={passOk ? "text-primary font-medium" : "text-muted-foreground"}>
                      {passOk ? "Senha ok" : `Faltam ${6 - password.length}`}
                    </span>
                  </div>
                )}
              </div>

              <Button type="submit" disabled={loading} className="w-full h-11 font-semibold group">
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    {isSignup ? "Criar minha conta" : "Entrar"}
                    <ArrowRight className="h-4 w-4 ml-1 transition-transform group-hover:translate-x-0.5" />
                  </>
                )}
              </Button>
            </form>

            <p className="text-[11px] text-center text-muted-foreground leading-relaxed">
              Ao continuar você aceita nossos{" "}
              <a className="underline underline-offset-2 hover:text-foreground" href="/docs">Termos</a>{" "}
              e{" "}
              <a className="underline underline-offset-2 hover:text-foreground" href="/docs">Política de Privacidade</a>.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

function GoogleIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.4-1.66 4.1-5.5 4.1-3.3 0-6-2.73-6-6.1s2.7-6.1 6-6.1c1.88 0 3.14.8 3.86 1.48l2.63-2.53C16.83 3.4 14.66 2.4 12 2.4 6.9 2.4 2.8 6.5 2.8 11.6S6.9 20.8 12 20.8c6.93 0 9.2-4.86 9.2-7.35 0-.5-.05-.87-.12-1.25H12z"/>
    </svg>
  );
}
