import { TrendingUp, TrendingDown, Wallet, Target } from "lucide-react";
import { MESES_ABREV } from "@/lib/format";
import { Money } from "@/components/Money";
import { KpiCard } from "@/components/KpiCard";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { motion } from "motion/react";

export interface DashboardProps {
  saldoHoje: number; saldoFimMes: number; saldoInicial: number;
  totalEntradasMes: number; totalSaidasMes: number;
  nome: string; dayName: string; dToday: number; m0: number;
  chartData: any[]; seis: any[];
  primeiroNegativo: any; ultimoPositivo: any;
  totalInvestido: number; variacaoPercentual: number;
  saldoVisivel: boolean; setSaldoVisivel: (v: boolean) => void;
}

export function DashboardMercury(p: DashboardProps) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <KpiCard label="Saldo" value={p.saldoHoje} icon={Wallet} tone="primary" delta={{ pct: p.variacaoPercentual }} />
        <KpiCard label="Entradas" value={p.totalEntradasMes} icon={TrendingUp} tone="positive" />
        <KpiCard label="Saídas" value={p.totalSaidasMes} icon={TrendingDown} tone="negative" />
        <KpiCard label="Investimentos" value={p.totalInvestido} icon={Target} tone="default" />
      </div>
      <div className="metric-card">
        <span className="eyebrow">Projeção 12 meses</span>
        <div className="h-40 mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={p.chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--color-muted-fg)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "var(--color-muted-fg)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} width={40} />
              <Tooltip content={({ active, payload }) => !active || !payload?.length ? null : (
                <div className="rounded-xl bg-card border border-border shadow-elevated p-3 text-xs space-y-1">
                  <div className="font-semibold">{payload[0].payload.label}</div>
                  <div>Saldo: <strong><Money value={payload[0].payload.saldo} /></strong></div>
                </div>
              )} />
              <Area type="monotone" dataKey="saldo" stroke="var(--color-primary)" strokeWidth={2} fill="var(--color-primary)" fillOpacity={0.08} dot={{ r: 3 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="metric-card">
        <span className="eyebrow">Entradas vs Saídas</span>
        <div className="h-32 mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={p.chartData} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--color-muted-fg)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "var(--color-muted-fg)" }} axisLine={false} tickLine={false} width={40} />
              <Bar dataKey="entradas" fill="var(--color-positive)" radius={[4,4,0,0]} maxBarSize={12} />
              <Bar dataKey="saidas" fill="var(--color-negative)" radius={[4,4,0,0]} maxBarSize={12} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </motion.div>
  );
}
