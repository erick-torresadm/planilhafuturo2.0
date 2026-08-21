import { cn } from "@/lib/utils";
import { Money } from "@/components/Money";
import { type LucideIcon } from "lucide-react";
import { motion } from "motion/react";

type Props = {
  label: string;
  value: number;
  icon?: LucideIcon;
  hint?: string;
  delta?: { pct: number; label?: string };
  tone?: "default" | "primary" | "positive" | "negative" | "warning";
  className?: string;
};

/* KpiCardV2 — variante do KpiCard com barra de acento lateral e fundo
   tonal (nao o card generico "icone + numero" do app atual). Usado
   so no /v2 — o KpiCard original continua intocado pro resto do app. */
const TONE = {
  default: { bar: "bg-muted-foreground/40", icon: "bg-muted text-muted-foreground", wash: "" },
  primary: { bar: "bg-primary", icon: "bg-primary/10 text-primary", wash: "bg-primary/[0.03]" },
  positive: {
    bar: "bg-positive",
    icon: "bg-positive-soft text-positive",
    wash: "bg-positive/[0.03]",
  },
  negative: {
    bar: "bg-negative",
    icon: "bg-negative-soft text-negative",
    wash: "bg-negative/[0.03]",
  },
  warning: { bar: "bg-warning", icon: "bg-warning-soft text-warning", wash: "bg-warning/[0.03]" },
} as const;

export function KpiCardV2({
  label,
  value,
  icon: Icon,
  hint,
  delta,
  tone = "default",
  className,
}: Props) {
  const t = TONE[tone];
  const forcedColor =
    tone === "positive" ? "text-positive" : tone === "negative" ? "text-negative" : undefined;

  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.15 }}
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border bg-card pl-4 pr-4 py-4",
        t.wash,
        className,
      )}
    >
      <span className={cn("absolute inset-y-0 left-0 w-1", t.bar)} aria-hidden />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="eyebrow">{label}</div>
          <div className="mt-2 num-lg text-2xl lg:text-[26px] leading-tight text-foreground">
            <Money value={value} className={forcedColor} signed={forcedColor ? false : undefined} />
          </div>
          {(hint || delta) && (
            <div className="mt-1.5 flex items-center gap-2 text-[11px] text-muted-foreground">
              {delta && (
                <span
                  className={cn(
                    "font-semibold tabular-nums",
                    delta.pct >= 0 ? "text-positive" : "text-negative",
                  )}
                >
                  {delta.pct >= 0 ? "▲" : "▼"} {Math.abs(delta.pct).toFixed(1)}%
                </span>
              )}
              {delta?.label && <span>{delta.label}</span>}
              {hint && <span className="truncate">{hint}</span>}
            </div>
          )}
        </div>
        {Icon && (
          <div className={cn("h-10 w-10 rounded-xl grid place-items-center shrink-0", t.icon)}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
    </motion.div>
  );
}
