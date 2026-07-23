import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — Planilha" },
      { name: "description", content: "Entre ou crie sua conta na Planilha." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const nav = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        nav({ to: "/" });
      } else {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: `${window.location.origin}/` },
        });
        if (error) throw error;
        toast.success("Conta criada!");
        nav({ to: "/onboarding" });
      }
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao autenticar");
    } finally { setLoading(false); }
  }

  async function google() {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (r.error) toast.error(String((r.error as any)?.message ?? r.error));
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
      <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-accent/30 blur-3xl" />

      <div className="w-full max-w-sm glass-strong p-7 relative fade-up">
        <div className="mb-6 text-center">
          <div className="h-12 w-12 rounded-2xl mint-gradient grid place-items-center mx-auto mb-3 font-bold text-lg">P</div>
          <div className="font-display text-2xl font-bold">Planilha</div>
          <div className="text-xs text-muted-foreground mt-1">Seu dinheiro nos próximos 6 meses</div>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <div>
            <Label htmlFor="email" className="text-xs uppercase tracking-widest text-muted-foreground">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="password" className="text-xs uppercase tracking-widest text-muted-foreground">Senha</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          </div>
          <Button type="submit" className="w-full mint-gradient font-semibold h-11" disabled={loading}>
            {mode === "login" ? "Entrar" : "Criar conta"}
          </Button>
        </form>

        <div className="my-4 flex items-center gap-3 text-[10px] uppercase tracking-widest text-muted-foreground">
          <div className="flex-1 h-px bg-border" /> ou <div className="flex-1 h-px bg-border" />
        </div>

        <Button variant="outline" className="w-full h-11 border-border" onClick={google}>
          Continuar com Google
        </Button>

        <button type="button" className="mt-4 text-xs text-muted-foreground hover:text-primary w-full text-center"
          onClick={() => setMode(mode === "login" ? "signup" : "login")}>
          {mode === "login" ? "Não tem conta? Criar" : "Já tenho conta"}
        </button>
      </div>
    </div>
  );
}
