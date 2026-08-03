import { motion } from "motion/react";
import { Link } from "@tanstack/react-router";
import {
  Sparkles, AlertTriangle, TrendingDown, Coins, ShieldCheck,
  Rocket, Lightbulb, CheckCircle2, ArrowRight, type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Insight, InsightIcon, InsightTone } from "@/lib/insights";

const TONE_CHIP: Record<InsightTone, string> = {
  danger: "bg-negative-soft text-negative",
  warning: "bg-warning-soft text-warning",
  positive: "bg-positive-soft text-positive",
  info: "bg-primary/10 text-primary",
};

const TONE_BORDER: Record<InsightTone, string> = {
  danger: "border-negative/20",
  warning: "border-warning/25",
  positive: "border-positive/20",
  info: "border-primary/20",
};

const ICONS: Record<InsightIcon, LucideIcon> = {
  alert: AlertTriangle,
  down: TrendingDown,
  cash: Coins,
  shield: ShieldCheck,
  rocket: Rocket,
  bulb: Lightbulb,
  check: CheckCircle2,
};

export function FinanceCoach({ nome, insights }: { nome: string; insights: Insight[] }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-2xl border border-border bg-card p-4 space-y-3"
    >
      <div className="flex items-center gap-2.5">
        <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary grid place-items-center">
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <h2 className="font-display text-sm font-semibold leading-tight">Seu conselheiro</h2>
          <p className="text-[11px] text-muted-foreground truncate">{nome}, o que eu li na sua planilha hoje</p>
        </div>
      </div>

      <div className="space-y-2">
        {insights.map((ins, i) => {
          const Icon = ICONS[ins.icon];
          return (
            <motion.div
              key={ins.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.08 + i * 0.07, duration: 0.3 }}
              className={cn("rounded-xl border p-3", TONE_BORDER[ins.tone])}
            >
              <div className="flex gap-2.5">
                <div className={cn("h-8 w-8 shrink-0 rounded-lg grid place-items-center", TONE_CHIP[ins.tone])}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold leading-snug">{ins.title}</div>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{ins.desc}</p>
                  {ins.cta && (
                    <Link
                      to={ins.cta.to}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-primary mt-1.5 hover:underline"
                    >
                      {ins.cta.label} <ArrowRight className="h-3 w-3" />
                    </Link>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.section>
  );
}
