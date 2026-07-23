import { brl } from "@/lib/format";
import { cn } from "@/lib/utils";

type Props = {
  value: number | string | null | undefined;
  className?: string;
  /** color the number based on sign */
  signed?: boolean;
  /** show + sign for positives when signed */
  showSign?: boolean;
  muted?: boolean;
  compact?: boolean;
};

export function Money({ value, className, signed, showSign, muted, compact }: Props) {
  const n = typeof value === "string" ? Number(value) : (value ?? 0);
  const cls = signed
    ? n > 0
      ? "text-positive"
      : n < 0
        ? "text-negative"
        : "text-muted-foreground"
    : muted
      ? "text-muted-foreground"
      : "";
  let str = brl(Math.abs(n));
  if (compact && Math.abs(n) >= 1000) {
    const abs = Math.abs(n);
    if (abs >= 1_000_000) str = `R$ ${(abs / 1_000_000).toFixed(1).replace(".", ",")}M`;
    else if (abs >= 1000) str = `R$ ${(abs / 1000).toFixed(1).replace(".", ",")}k`;
  }
  const prefix = n < 0 ? "−" : showSign && n > 0 ? "+" : "";
  return <span className={cn("num tabular-nums", cls, className)}>{prefix}{str.replace("R$", "R$")}</span>;
}
