import { TrendingUp, TrendingDown, Wallet, Target, Eye, EyeOff, CalendarClock } from "lucide-react";
import { MESES } from "@/lib/format";
import { Money } from "@/components/Money";
import { KpiCardV2 } from "@/components/dashboards/KpiCardV2";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import type { DashboardProps } from "@/components/dashboards";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } },
};

export function DashboardV2(p: DashboardProps) {
  const dataLonga = `${p.dToday} de ${MESES[p.m0]}`;

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-4">
      {/* Hero balance */}
      <motion.div
        variants={item}
        className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 sm:p-7"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <CalendarClock className="h-3.5 w-3.5" /> {dataLonga} · {p.nome}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className="eyebrow">Saldo de hoje</span>
              <button
                onClick={() => p.setSaldoVisivel(!p.saldoVisivel)}
                className="grid place-items-center rounded-full p-2.5 -m-2.5 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                aria-label={p.saldoVisivel ? "Ocultar saldo" : "Mostrar saldo"}
              >
                {p.saldoVisivel ? (
                  <Eye className="h-3.5 w-3.5" />
                ) : (
                  <EyeOff className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
            <div className="mt-1 font-mono text-3xl sm:text-5xl font-bold tabular-nums tracking-tight">
              {p.saldoVisivel ? <Money value={p.saldoHoje} /> : "••••••"}
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs">
              <span
                className={cn(
                  "inline-flex items-center gap-1 font-semibold tabular-nums",
                  p.variacaoPercentual >= 0 ? "text-positive" : "text-negative",
                )}
              >
                {p.variacaoPercentual >= 0 ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {Math.abs(p.variacaoPercentual).toFixed(1)}%
              </span>
              <span className="text-muted-foreground">desde o saldo base</span>
            </div>
          </div>
          <div className="hidden sm:block w-40 h-20 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={p.chartData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="hero-fill-v2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="saldo"
                  stroke="var(--color-primary)"
                  strokeWidth={2}
                  fill="url(#hero-fill-v2)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </motion.div>

      {/* KPI row */}
      <motion.div variants={item} className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        <KpiCardV2 label="Fim do mês" value={p.saldoFimMes} icon={Wallet} tone="primary" />
        <KpiCardV2 label="Entradas" value={p.totalEntradasMes} icon={TrendingUp} tone="positive" />
        <KpiCardV2 label="Saídas" value={p.totalSaidasMes} icon={TrendingDown} tone="negative" />
        <KpiCardV2 label="Investido" value={p.totalInvestido} icon={Target} tone="default" />
      </motion.div>

      {/* Projeção */}
      <motion.div variants={item} className="rounded-2xl border border-border bg-card p-4 sm:p-5">
        <span className="eyebrow">Projeção 12 meses</span>
        <div className="h-44 sm:h-56 mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={p.chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="proj-fill-v2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: "var(--color-muted-fg)" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "var(--color-muted-fg)" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                width={44}
              />
              <Tooltip
                content={({ active, payload }) =>
                  !active || !payload?.length ? null : (
                    <div className="rounded-xl bg-card border border-border shadow-elevated p-3 text-xs space-y-1">
                      <div className="font-semibold">{payload[0].payload.label}</div>
                      <div>
                        Saldo:{" "}
                        <strong>
                          <Money value={payload[0].payload.saldo} />
                        </strong>
                      </div>
                    </div>
                  )
                }
              />
              <Area
                type="monotone"
                dataKey="saldo"
                stroke="var(--color-primary)"
                strokeWidth={2.5}
                fill="url(#proj-fill-v2)"
                dot={{ r: 3 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Entradas vs saidas */}
      <motion.div variants={item} className="rounded-2xl border border-border bg-card p-4 sm:p-5">
        <span className="eyebrow">Entradas vs Saídas</span>
        <div className="h-32 sm:h-40 mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={p.chartData} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: "var(--color-muted-fg)" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "var(--color-muted-fg)" }}
                axisLine={false}
                tickLine={false}
                width={40}
              />
              <Bar
                dataKey="entradas"
                fill="var(--color-positive)"
                radius={[4, 4, 0, 0]}
                maxBarSize={14}
              />
              <Bar
                dataKey="saidas"
                fill="var(--color-negative)"
                radius={[4, 4, 0, 0]}
                maxBarSize={14}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>
    </motion.div>
  );
}
