import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, MessageCircle, Mail, Clock, ShieldCheck, BookOpen, FileQuestion } from "lucide-react";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/suporte")({
  head: () => ({
    meta: [
      { title: "Suporte — planilhafuturo" },
      { name: "description", content: "Fale com a gente pelo WhatsApp ou email. Suporte humano, resposta rápida." },
      { property: "og:url", content: "https://planilhafuturo.com.br/suporte" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://planilhafuturo.com.br/suporte" }],
  }),
  component: SuportePage,
});

// ─────────────────────────────────────────────────────────────
// NÚMERO DO WHATSAPP — substitua pelo número real no formato
// internacional: DDI + DDD + número (ex.: "5511999999999").
// ─────────────────────────────────────────────────────────────
const WHATSAPP_NUMERO = "5511948333534";
const EMAIL = "contato@planilhafuturo.com.br";
const WHATSAPP_LINK = `https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent("Olá! Preciso de ajuda com a planilhafuturo.")}`;

function SuportePage() {
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
            <Link to="/auth" className="cta-pill px-4 py-2 text-sm">
              Começar grátis <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 sm:px-8 py-14 sm:py-20">
        {/* Hero */}
        <div className="text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground mb-6">
            <MessageCircle className="h-3.5 w-3.5 text-primary" /> Suporte humano de verdade
          </div>
          <h1 className="font-display text-4xl sm:text-5xl leading-tight tracking-tight">
            Como podemos<br /><span className="italic text-primary">te ajudar?</span>
          </h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-md mx-auto">
            Dúvida sobre o app, pagamento ou a planilha? Fala com a gente — resposta em até 24h.
          </p>
        </div>

        {/* Canais de contato */}
        <div className="mt-12 grid md:grid-cols-2 gap-4 max-w-3xl mx-auto">
          {/* WhatsApp */}
          <a
            href={WHATSAPP_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="group rounded-2xl border border-border bg-card p-7 flex flex-col gap-3 transition hover:border-primary/40 hover:shadow-card"
          >
            <div className="h-12 w-12 rounded-2xl bg-positive/10 grid place-items-center">
              <MessageCircle className="h-6 w-6 text-positive" />
            </div>
            <div className="font-display text-xl">WhatsApp</div>
            <p className="text-sm text-muted-foreground">
              O jeito mais rápido. Atendimento direto, sem robô.
            </p>
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-primary mt-auto">
              Chamar no WhatsApp <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </span>
          </a>

          {/* Email */}
          <a
            href={`mailto:${EMAIL}`}
            className="group rounded-2xl border border-border bg-card p-7 flex flex-col gap-3 transition hover:border-primary/40 hover:shadow-card"
          >
            <div className="h-12 w-12 rounded-2xl bg-primary/10 grid place-items-center">
              <Mail className="h-6 w-6 text-primary" />
            </div>
            <div className="font-display text-xl">Email</div>
            <p className="text-sm text-muted-foreground">
              Prefere escrever? Respondemos em até 24h úteis.
            </p>
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-primary mt-auto">
              {EMAIL} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </span>
          </a>
        </div>

        {/* Respostas rápidas */}
        <div className="mt-16 max-w-3xl mx-auto">
          <h2 className="font-display text-2xl font-bold text-center">Talvez a resposta já esteja aqui</h2>
          <div className="mt-6 grid sm:grid-cols-2 gap-4">
            {[
              { icon: BookOpen, title: "Como usar o app", desc: "Guia passo a passo do começo ao fim.", to: "/guia" },
              { icon: FileQuestion, title: "Perguntas frequentes", desc: "Trial, preços, cancelamento, segurança.", to: "/" },
              { icon: ShieldCheck, title: "Privacidade & dados", desc: "O que guardamos e como protegemos.", to: "/privacidade" },
              { icon: Clock, title: "Garantia de 7 dias", desc: "Reembolso sem burocracia em todos os planos.", to: "/checkout" },
            ].map((c) => (
              <Link
                key={c.title}
                to={c.to}
                className="rounded-xl border border-border bg-card p-5 flex items-start gap-3 transition hover:border-primary/40"
              >
                <c.icon className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <div className="font-medium text-sm">{c.title}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{c.desc}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Promessa */}
        <div className="mt-16 text-center">
          <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-positive" />
            Atendimento pelo fundador — sem call center, sem resposta automática.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="mx-auto max-w-6xl px-5 sm:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <div>© {new Date().getFullYear()} planilhafuturo · grupo Fandim Capital</div>
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
