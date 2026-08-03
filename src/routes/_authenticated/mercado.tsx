import { createFileRoute } from "@tanstack/react-router";
import { useExternalData } from "@/hooks/useExternalData";
import { useQuery } from "@tanstack/react-query";
import { Money } from "@/components/Money";
import { PageHeader } from "@/components/PageHeader";
import { KpiCard } from "@/components/KpiCard";
import { TrendingUp, TrendingDown, DollarSign, Bitcoin, Landmark, PiggyBank, RefreshCw, ExternalLink, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

export const Route = createFileRoute("/_authenticated/mercado")({
  head: () => ({ meta: [{ title: "Mercado — Planilha" }] }),
  component: MercadoPage,
});

function MercadoPage() {
  const { data, loading, refresh } = useExternalData();
  const [btc, setBtc] = useState<{ brl: number | null; change24h: number | null }>({ brl: null, change24h: null });

  useEffect(() => {
    fetch("https://economia.awesomeapi.com.br/json/last/BTC-BRL")
      .then((r) => r.json())
      .then((d) => {
        if (d.BTCBRL) {
          setBtc({
            brl: parseFloat(d.BTCBRL.bid),
            change24h: parseFloat(d.BTCBRL.pctChange),
          });
        }
      })
      .catch(() => {});
  }, []);

  const indicators = [
    {
      label: "Dólar (USD)",
      value: data.usd,
      icon: DollarSign,
      format: (v: number) => `R$ ${v.toFixed(2)}`,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      label: "Euro (EUR)",
      value: data.eur,
      icon: TrendingUp,
      format: (v: number) => `R$ ${v.toFixed(2)}`,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Bitcoin (BTC)",
      value: btc.brl,
      icon: Bitcoin,
      format: (v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
      color: "text-amber-600",
      bg: "bg-amber-50",
      change: btc.change24h,
    },
    {
      label: "Selic",
      value: data.selic,
      icon: Landmark,
      format: (v: number) => `${v.toFixed(2)}%`,
      color: "text-primary",
      bg: "bg-primary/5",
    },
    {
      label: "IPCA (12 meses)",
      value: data.ipca,
      icon: PiggyBank,
      format: (v: number) => `${v.toFixed(1)}%`,
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
  ];

  return (
    <div className="page-container space-y-4 animate-in">
      <PageHeader
        eyebrow="Mercado"
        title="Indicadores financeiros"
        subtitle="Cotações e taxas atualizadas"
        actions={
          <button
            onClick={refresh}
            disabled={loading}
            className="h-9 px-3 rounded-xl bg-card border border-border text-xs font-semibold flex items-center gap-1.5 hover:bg-muted transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            Atualizar
          </button>
        }
      />

      {/* Última atualização */}
      {data.updatedAt && (
        <div className="text-[11px] text-muted-foreground flex items-center gap-2">
          <span>Última atualização: {data.updatedAt}</span>
          <span className="text-muted-foreground/30">·</span>
          <span className="text-muted-foreground/60">Dados públicos via AwesomeAPI e BrasilAPI</span>
        </div>
      )}

      {/* Grid de indicadores */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {indicators.map((ind) => {
          if (ind.value === null) return null;
          return (
            <div key={ind.label} className="rounded-xl bg-card border border-border p-4 transition-all hover:shadow-sm">
              <div className="flex items-center gap-3">
                <div className={cn("h-10 w-10 rounded-xl grid place-items-center shrink-0", ind.bg)}>
                  <ind.icon className={cn("h-5 w-5", ind.color)} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] text-muted-foreground font-medium">{ind.label}</div>
                  <div className="font-display text-xl font-bold tabular-nums mt-0.5">
                    {ind.value !== null ? ind.format(ind.value) : "—"}
                  </div>
                  {typeof ind.change === "number" && (
                    <div className={cn(
                      "text-xs font-semibold flex items-center gap-0.5 mt-0.5",
                      ind.change >= 0 ? "text-positive" : "text-negative",
                    )}>
                      {ind.change >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                      {Math.abs(ind.change).toFixed(2)}% (24h)
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Notas legais */}
      <div className="rounded-xl bg-muted/50 border border-border p-4">
        <h3 className="text-xs font-semibold flex items-center gap-1.5 mb-2">
          <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" /> Fontes
        </h3>
        <ul className="space-y-1 text-[11px] text-muted-foreground">
          <li>• Câmbio (USD, EUR, BTC): <a href="https://economia.awesomeapi.com.br" target="_blank" rel="noopener noreferrer" className="text-primary underline">AwesomeAPI</a> — dados abertos</li>
          <li>• Selic: <a href="https://brasilapi.com.br" target="_blank" rel="noopener noreferrer" className="text-primary underline">BrasilAPI</a> — dados públicos do BCB</li>
          <li>• IPCA: estimativa com base no relatório Focus (BCB)</li>
          <li className="text-[10px] text-muted-foreground/50 mt-1">Os dados são fornecidos apenas para consulta. Não constituem recomendação de investimento.</li>
        </ul>
      </div>
    </div>
  );
}
