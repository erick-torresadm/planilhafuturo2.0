import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { PageHeader } from "@/components/PageHeader";
import {
  Smartphone, MoreHorizontal, Download, Check, Home, Share, Plus,
  MonitorSmartphone, Zap, Lock, Bell, MessageCircle, Sparkles, ArrowRight,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/sobre")({
  head: () => ({ meta: [{ title: "Sobre o aplicativo — planilhafuturo" }] }),
  component: SobrePage,
});

const WA_MSG = encodeURIComponent("Olá! Preciso de ajuda para instalar o aplicativo da planilhafuturo.");
const WA_LINK = `https://wa.me/5511948333534?text=${WA_MSG}`;

const PASSO_ANDROID: { icon: LucideIcon; texto: string }[] = [
  { icon: Smartphone, texto: "Abra a planilhafuturo no Google Chrome (o navegador padrão do Android)." },
  { icon: MoreHorizontal, texto: "Toque nos três pontinhos ⋮, no canto superior direito." },
  { icon: Download, texto: "Toque em “Instalar app” (ou “Adicionar à tela inicial”)." },
  { icon: Check, texto: "Confirme tocando em “Instalar”." },
  { icon: Home, texto: "Pronto! O ícone da planilhafuturo aparece na sua tela inicial." },
];

const PASSO_IOS: { icon: LucideIcon; texto: string }[] = [
  { icon: Smartphone, texto: "Abra a planilhafuturo no Safari (o navegador do iPhone)." },
  { icon: Share, texto: "Toque no botão Compartilhar — o quadrado com a seta pra cima." },
  { icon: Plus, texto: "Role até “Adicionar à Tela de Início”." },
  { icon: Check, texto: "Toque em “Adicionar”, no canto superior direito." },
  { icon: Home, texto: "Pronto! O ícone da planilhafuturo aparece na sua tela inicial." },
];

const BENEFICIOS: { icon: LucideIcon; titulo: string; texto: string }[] = [
  { icon: MonitorSmartphone, titulo: "Tela cheia", texto: "Abre como um app de verdade, sem a barra do navegador." },
  { icon: Home, titulo: "Atalho na tela inicial", texto: "Um toque pra abrir, igual qualquer outro app." },
  { icon: Zap, titulo: "Mais rápido", texto: "Carrega da tela inicial, com cara e jeito de nativo." },
  { icon: Lock, titulo: "Mesma segurança", texto: "Seus dados continuam protegidos, RLS por usuário." },
  { icon: Bell, titulo: "Pronto pra lembrar", texto: "Infraestrutura de notificações pronta pros seus vencimentos." },
];

function SobrePage() {
  const [device, setDevice] = useState<"android" | "ios">("android");
  const [standalone, setStandalone] = useState(false);
  const [canInstall, setCanInstall] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setStandalone(
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (navigator as any).standalone === true,
    );
    setCanInstall(typeof (window as any).__installPWA === "function");
  }, []);

  const passos = useMemo(() => (device === "android" ? PASSO_ANDROID : PASSO_IOS), [device]);

  return (
    <div className="page-container space-y-4 animate-in">
      <PageHeader
        eyebrow="App"
        title="Sobre o aplicativo"
        subtitle="Instale a planilhafuturo no seu celular e use como app de verdade."
      />

      {/* Status de instalação */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className={cn(
          "rounded-2xl border p-5 space-y-3",
          standalone ? "border-positive/30 bg-positive-soft/40" : "border-border bg-card",
        )}
      >
        <div className="flex items-center gap-3">
          <div className={cn(
            "h-11 w-11 rounded-2xl grid place-items-center shrink-0",
            standalone ? "bg-positive text-white" : "bg-primary/10 text-primary",
          )}>
            {standalone ? <Check className="h-5 w-5" /> : <Smartphone className="h-5 w-5" />}
          </div>
          <div className="min-w-0">
            <h2 className="font-display text-lg font-semibold leading-tight">
              {standalone ? "Você já tem o app instalado" : "Instale no seu celular"}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {standalone
                ? "Que bom ter você por aqui. Use o ícone da tela inicial pra abrir mais rápido."
                : canInstall
                  ? "O navegador permite instalar agora. É só um toque."
                  : "Use o passo a passo abaixo — leva menos de 1 minuto."}
            </p>
          </div>
        </div>

        {!standalone && canInstall && (
          <button
            onClick={() => (window as any).__installPWA?.()}
            className="w-full inline-flex items-center justify-center gap-2 h-12 rounded-xl bg-primary text-primary-foreground font-semibold text-sm active:scale-[0.98] transition-transform"
          >
            <Download className="h-4 w-4" /> Instalar agora
          </button>
        )}
      </motion.section>

      {/* Passo a passo */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.1 }}
        className="rounded-2xl border border-border bg-card p-4 space-y-3"
      >
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary grid place-items-center">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h2 className="font-display text-sm font-semibold">Passo a passo</h2>
            <p className="text-[11px] text-muted-foreground">Escolha o seu celular</p>
          </div>
        </div>

        {/* Seletor de dispositivo */}
        <div className="flex gap-1 p-1 rounded-xl bg-muted w-fit">
          {(["android", "ios"] as const).map((d) => (
            <button key={d} onClick={() => setDevice(d)}
              className={cn("px-4 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all flex items-center gap-1.5",
                device === d ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
              <Smartphone className="h-3.5 w-3.5" />
              {d === "android" ? "Android" : "iPhone"}
            </button>
          ))}
        </div>

        {/* Lista de passos animada */}
        <AnimatePresence mode="wait">
          <motion.ol
            key={device}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.25 }}
            className="space-y-2"
          >
            {passos.map((p, i) => {
              const Icon = p.icon;
              return (
                <motion.li
                  key={device + i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.12 + i * 0.08, duration: 0.3 }}
                  className="flex items-center gap-3 p-3 rounded-xl border border-border/60"
                >
                  <div className="h-7 w-7 shrink-0 rounded-lg bg-muted text-foreground grid place-items-center">
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <p className="text-xs text-muted-foreground flex-1 leading-relaxed">
                    <span className="font-bold text-foreground mr-1">{i + 1}.</span> {p.texto}
                  </p>
                </motion.li>
              );
            })}
          </motion.ol>
        </AnimatePresence>
      </motion.section>

      {/* Benefícios */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.2 }}
        className="rounded-2xl border border-border bg-card p-4 space-y-3"
      >
        <h2 className="font-display text-sm font-semibold flex items-center gap-2">
          <MonitorSmartphone className="h-4 w-4 text-primary" /> Por que instalar?
        </h2>
        <div className="grid sm:grid-cols-2 gap-2">
          {BENEFICIOS.map((b) => {
            const Icon = b.icon;
            return (
              <div key={b.titulo} className="rounded-xl border border-border/60 p-3 flex gap-2.5">
                <Icon className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <div className="text-xs font-semibold">{b.titulo}</div>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{b.texto}</p>
                </div>
              </div>
            );
          })}
        </div>
      </motion.section>

      {/* Suporte */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.3 }}
        className="rounded-2xl border border-border bg-card p-4 flex flex-col sm:flex-row sm:items-center gap-3"
      >
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <div className="h-9 w-9 rounded-xl bg-positive/10 text-positive grid place-items-center shrink-0">
            <MessageCircle className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold">Travou em alguma etapa?</div>
            <p className="text-xs text-muted-foreground">Me chama no WhatsApp que eu te ajudo na hora.</p>
          </div>
        </div>
        <a
          href={WA_LINK}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-1.5 shrink-0 h-11 px-4 rounded-xl bg-positive text-white text-sm font-semibold active:scale-[0.98] transition-transform"
        >
          Falar no WhatsApp <ArrowRight className="h-4 w-4" />
        </a>
      </motion.section>

      <p className="text-[11px] text-muted-foreground text-center">
        A planilhafuturo é um PWA (Progressive Web App). Ele se instala direto do navegador, sem loja e sem download de arquivo.
      </p>
    </div>
  );
}
