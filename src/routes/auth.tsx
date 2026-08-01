import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/lib/auth-context";
import { Crown, Mail, Lock, Loader2, Eye, EyeOff, Chrome, MailCheck, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, string | undefined>) => ({
    email: search.email as string | undefined,
    plan: search.plan as string | undefined,
  }),
  head: () => ({
    meta: [
      { title: "Entrar — planilhafuturo" },
      { name: "description", content: "Entre ou crie sua conta na planilhafuturo e enxergue seus próximos 12 meses." },
    ],
  }),
  component: AuthPage,
});

type Tab = "entrar" | "criar";

function AuthPage() {
  const nav = useNavigate();
  const { user, loading: authLoading, signIn, signUp, signInWithGoogle } = useAuth();
  const { email: planEmail, plan: planName } = Route.useSearch();
  const emailLocked = !!planEmail;

  const [tab, setTab] = useState<Tab>(planEmail ? "criar" : "entrar");
  const [email, setEmail] = useState(planEmail ?? "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [nome, setNome] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [justSignedUp, setJustSignedUp] = useState(false);

  // If already logged in, redirect (ativando plano pré-pago, se veio de um checkout)
  useEffect(() => {
    if (!authLoading && user) {
      if (planEmail) {
        import("@/lib/assinatura.functions")
          .then((m) => m.activatePlanPostSignup({ data: { email: planEmail } }))
          .then((result) => {
            if (result.ok) toast.success(`Plano ${result.plano} ativado! Bem-vindo!`, { duration: 5000 });
          })
          .catch(() => {});
      }
      nav({ to: "/app" });
    }
  }, [user, authLoading, nav, planEmail]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setJustSignedUp(false);

    if (!email.trim()) { setError("Digite seu email"); return; }
    if (tab === "criar" && !nome.trim()) { setError("Digite seu nome"); return; }
    if (password.length < 6) { setError("Senha deve ter no mínimo 6 caracteres"); return; }
    if (tab === "criar" && password !== confirmPassword) { setError("Senhas não conferem"); return; }

    setSubmitting(true);

    if (tab === "criar") {
      const { error: err, needsConfirmation } = await signUp(email.trim(), password, nome.trim());
      setSubmitting(false);

      if (err) {
        setError(err);
        toast.error(err);
        return;
      }

      if (needsConfirmation) {
        toast.success("Conta criada!", { description: "Verifique seu email para ativar sua conta." });
        setJustSignedUp(true);
      } else {
        // Try to activate pre-paid plan
        if (planEmail) {
          try {
            const m = await import("@/lib/assinatura.functions");
            const result = await m.activatePlanPostSignup({ data: { email: planEmail } });
            if (result.ok) {
              toast.success(`Plano ${result.plano} ativado! Bem-vindo!`, { duration: 5000 });
            }
          } catch {}
        }
        toast.success("Conta criada com sucesso!");
        // onAuthStateChange will redirect
      }
    } else {
      const { error: err } = await signIn(email.trim(), password);
      setSubmitting(false);

      if (err) {
        setError(err);
        toast.error(err);
        return;
      }

      // Try to activate pre-paid plan
      if (planEmail) {
        try {
          const m = await import("@/lib/assinatura.functions");
          const result = await m.activatePlanPostSignup({ data: { email: planEmail } });
          if (result.ok) {
            toast.success(`Plano ${result.plano} ativado! Bem-vindo!`, { duration: 5000 });
          }
        } catch {}
      }

      toast.success("Bem-vindo de volta!");
      // onAuthStateChange will redirect
    }
  }

  // Show loading while checking session
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Already logged in — don't flash the form
  if (user) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-6">
        {/* Logo + heading */}
        <div className="flex flex-col items-center gap-1 text-center">
          <Logo size={28} />
          <p className="text-sm text-muted-foreground mt-0.5">
            {tab === "entrar" ? "Entre na sua conta" : "Crie sua conta"}
          </p>
        </div>

        {/* Plan activation notice */}
        {planEmail && planName && (
          <div className="rounded-xl bg-positive-soft border border-positive/20 px-4 py-3 space-y-1">
            <div className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-positive shrink-0" />
              <p className="font-semibold text-sm text-positive">Pagamento confirmado!</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Você pagou pelo <strong>PRO {planName === "vitalicio" ? "Vitalício" : "Anual"}</strong>!
              Crie sua conta com o email <strong>{planEmail}</strong> para ativar seu plano.
            </p>
          </div>
        )}

        {/* Tab switcher */}
        <div className="flex bg-muted rounded-xl p-1">
          {(["entrar", "criar"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setError(""); setJustSignedUp(false); setNome(""); }}
              className={cn(
                "flex-1 py-2 text-sm font-semibold rounded-lg transition-all",
                tab === t ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t === "entrar" ? "Entrar" : "Criar conta"}
            </button>
          ))}
        </div>

        {/* Email confirmation notice */}
        {justSignedUp && (
          <div className="rounded-xl bg-warning-soft border border-warning/20 px-4 py-3 text-sm flex items-start gap-3">
            <MailCheck className="h-5 w-5 text-warning shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-warning mb-0.5">Conta criada!</p>
              <p className="text-muted-foreground">
                Enviamos um email de confirmação para <strong>{email}</strong>. Por segurança, confirme seu email antes de fazer login.
              </p>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-xl bg-negative-soft border border-negative/20 px-4 py-3 text-sm text-negative font-medium">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {tab === "criar" && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Nome</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Seu nome"
                  className="w-full h-11 pl-10 pr-4 rounded-xl border border-border bg-card text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                  autoComplete="name"
                />
              </div>
            </div>
          )}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="email"
                value={email}
                onChange={(e) => { if (!emailLocked) setEmail(e.target.value); }}
                readOnly={emailLocked}
                placeholder="seu@email.com"
                className={`w-full h-11 pl-10 pr-4 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all ${emailLocked ? "bg-muted text-muted-foreground cursor-not-allowed border-muted" : "bg-card border-border"}`}
                autoComplete="email"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Senha</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="w-full h-11 pl-10 pr-10 rounded-xl border border-border bg-card text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                autoComplete={tab === "criar" ? "new-password" : "current-password"}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          {tab === "criar" && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Confirmar senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita a senha"
                  className="w-full h-11 pl-10 pr-4 rounded-xl border border-border bg-card text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                  autoComplete="new-password"
                />
              </div>
            </div>
          )}
          <Button type="submit" disabled={submitting} className="w-full h-11 rounded-xl font-semibold">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {tab === "entrar" ? "Entrar" : "Criar conta"}
          </Button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <div className="flex-1 h-px bg-border" />
          <span>ou</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Google OAuth */}
        <button
          onClick={async () => {
            toast.info("Redirecionando para o Google...");
            await signInWithGoogle();
          }}
          className="w-full h-11 flex items-center justify-center gap-2 rounded-xl border border-border bg-card text-sm font-semibold hover:bg-muted transition-colors"
        >
          <Chrome className="h-4 w-4" />
          Continuar com Google
        </button>

        {/* Footer links */}
        <div className="flex justify-center gap-4 text-xs text-muted-foreground pt-2">
          <Link to="/" className="hover:text-foreground">Home</Link>
          <Link to="/docs" className="hover:text-foreground">Termos</Link>
          <Link to="/privacidade" className="hover:text-foreground">Privacidade</Link>
        </div>
      </div>
    </div>
  );
}
