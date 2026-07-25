import { cn } from "@/lib/utils";
import { Money } from "@/components/Money";
import { type LucideIcon } from "lucide-react";

type Props = {
  label: string;
  value: number;
  icon?: LucideIcon;
  hint?: string;
  delta?: { pct: number; label?: string };
  tone?: "default" | "primary" | "positive" | "negative" | "warning";
  className?: string;
};

const TONE = {
  default:  { bg: "bg-muted",           fg: "text-muted-foreground" },
  primary:  { bg: "bg-primary/10",      fg: "text-primary" },
  positive: { bg: "bg-positive-soft",   fg: "text-positive" },
  negative: { bg: "bg-negative-soft",   fg: "text-negative" },
  warning:  { bg: "bg-warning-soft",    fg: "text-warning" },
} as const;

export function KpiCard({ label, value, icon: Icon, hint, delta, tone = "default", className }: Props) {
  const t = TONE[tone];
  return (
    <div className={cn("hope-card p-5", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="eyebrow">{label}</div>
          <div className="mt-2 num-lg text-2xl lg:text-[26px] leading-tight text-foreground">
            <Money value={value} />
          </div>
          {(hint || delta) && (
            <div className="mt-1.5 flex items-center gap-2 text-[11px] text-muted-foreground">
              {delta && (
                <span className={cn(
                  "font-semibold tabular-nums",
                  delta.pct >= 0 ? "text-positive" : "text-negative",
                )}>
                  {delta.pct >= 0 ? "▲" : "▼"} {Math.abs(delta.pct).toFixed(1)}%
                </span>
              )}
              {delta?.label && <span>{delta.label}</span>}
              {hint && <span>{hint}</span>}
            </div>
          )}
        </div>
        {Icon && (
          <div className={cn("h-10 w-10 rounded-lg grid place-items-center shrink-0", t.bg)}>
            <Icon className={cn("h-5 w-5", t.fg)} />
          </div>
        )}
      </div>
    </div>
  );
}
