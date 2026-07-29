import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import {
  ArrowRight, Sparkles, ShieldCheck, LineChart,
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

  useEffect(() => {
    // Local dev: auto-redirect to app
    nav({ to: "/app" });
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-8 text-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-primary grid place-items-center">
            <Logo size={22} withWordmark={false} />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold">planilhafuturo</h1>
            <p className="text-sm text-muted-foreground mt-1">Redirecionando...</p>
          </div>
        </div>

        <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
          <Sparkles className="h-4 w-4" />
          <p>Modo de desenvolvimento local</p>
          <Button onClick={() => nav({ to: "/app" })} className="mt-4 bg-primary text-primary-foreground font-semibold">
            Ir para o app <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-2 text-[11px] text-muted-foreground pt-4">
          <Link to="/">Home</Link>
          <Link to="/docs">Termos</Link>
          <Link to="/privacidade">Privacidade</Link>
        </div>
      </div>
    </div>
  );
}
