import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/lib/auth-context";
import { Mail, Lock, Loader2, Eye, EyeOff, Chrome } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — planilhafuturo" },
      { name: "description", content: "Entre ou crie sua conta na planilhafuturo e enxergue seus próximos 6 meses." },
    ],
  }),
  component: AuthPage,
});

type Tab = "entrar" | "criar";

function AuthPage() {
  const nav = useNavigate();
  const { user, loading: authLoading, signIn, signUp, signInWithGoogle } = useAuth();

  const [tab, setTab] = useState<Tab>("entrar");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // If already logged in, redirect
  useEffect(() => {
    if (!authLoading && user) nav({ to: "/app" });
  }, [user, authLoading, nav]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!email.trim()) { setError("Digite seu email"); return; }
    if (password.length < 6) { setError("Senha deve ter no mínimo 6 caracteres"); return; }
    if (tab === "criar" && password !== confirmPassword) { setError("Senhas não conferem"); return; }

    setSubmitting(true);
    const { error: err } = tab === "criar"
      ? await signUp(email.trim(), password)
      : await signIn(email.trim(), password);
    setSubmitting(false);

    if (err) {
      setError(err === "Invalid login credentials" ? "Email ou senha incorretos" : err);
    }
    // On success, the onAuthStateChange will trigger and redirect via effect above
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

        {/* Tab switcher */}
        <div className="flex bg-muted rounded-xl p-1">
          {(["entrar", "criar"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setError(""); }}
              className={cn(
                "flex-1 py-2 text-sm font-semibold rounded-lg transition-all",
                tab === t ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t === "entrar" ? "Entrar" : "Criar conta"}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-xl bg-negative-soft border border-negative/20 px-4 py-3 text-sm text-negative font-medium">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="w-full h-11 pl-10 pr-4 rounded-xl border border-border bg-card text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
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
          onClick={() => signInWithGoogle()}
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
