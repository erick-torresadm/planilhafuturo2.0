import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

function fmt(n: number): string {
  if (!isFinite(n) || n === 0) return "";
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function parse(s: string): number {
  if (!s) return 0;
  const clean = s.replace(/\s/g, "").replace(/R\$/gi, "").replace(/\./g, "").replace(",", ".");
  const n = Number(clean);
  return isFinite(n) ? n : 0;
}

export type MoneyInputProps = {
  value: number;
  onCommit: (v: number) => void;
  className?: string;
  inputClassName?: string;
  align?: "left" | "right" | "center";
  size?: "sm" | "md" | "lg";
  placeholder?: string;
  autoFocus?: boolean;
  disabled?: boolean;
  alwaysShowPrefix?: boolean;
};

/**
 * Hope UI Money input — bordered pill with R$ prefix, mono digits, blue focus ring.
 */
export function MoneyInput({
  value,
  onCommit,
  className,
  inputClassName,
  align = "right",
  size = "md",
  placeholder = "0,00",
  autoFocus,
  disabled,
  alwaysShowPrefix = true,
}: MoneyInputProps) {
  const [txt, setTxt] = useState<string>(fmt(Number(value) || 0));
  const [focused, setFocused] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  // Último valor que enviamos ao parent mas que ainda não foi confirmado
  // (a rede pode levar alguns ms). Evita o "pulo" de voltar ao valor antigo.
  const lastSent = useRef<number | null>(null);

  useEffect(() => {
    if (focused) return;
    // O parent confirmou o que enviamos → limpa o pendente.
    if (lastSent.current !== null && Number(value || 0) === lastSent.current) {
      lastSent.current = null;
    }
    // Só re-sincroniza do prop quando não há commit pendente.
    if (lastSent.current === null) {
      setTxt(fmt(Number(value) || 0));
    }
  }, [value, focused]);

  const showPrefix = alwaysShowPrefix || txt.length > 0 || focused;
  const alignCls =
    align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";
  const sizeCls =
    size === "sm" ? "h-8 text-[13px]" : size === "lg" ? "h-11 text-base" : "h-9 text-sm";

  return (
    <div
      className={cn(
        "relative inline-flex items-center bg-card border border-border rounded-md w-full",
        "focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20",
        "transition-colors",
        disabled && "opacity-60 bg-muted",
        className,
      )}
    >
      {showPrefix && (
        <span
          className={cn(
            "pointer-events-none select-none pl-2.5 pr-1 text-[11px] font-mono font-semibold uppercase",
            focused ? "text-primary" : "text-muted-foreground",
          )}
        >
          R$
        </span>
      )}
      <input
        ref={ref}
        type="text"
        inputMode="decimal"
        autoFocus={autoFocus}
        disabled={disabled}
        value={txt}
        placeholder={placeholder}
        onFocus={(e) => {
          setFocused(true);
          requestAnimationFrame(() => e.target.select());
        }}
        onChange={(e) => {
          const raw = e.target.value.replace(/[^\d.,-]/g, "");
          setTxt(raw);
        }}
        onBlur={() => {
          setFocused(false);
          const n = parse(txt);
          setTxt(fmt(n));
          if (n !== Number(value)) {
            lastSent.current = n;
            onCommit(n);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          else if (e.key === "Escape") {
            setTxt(fmt(Number(value) || 0));
            (e.target as HTMLInputElement).blur();
          }
        }}
        className={cn(
          "flex-1 min-w-0 bg-transparent outline-none px-2 tabular-nums font-mono font-medium",
          alignCls,
          sizeCls,
          inputClassName,
        )}
      />
    </div>
  );
}
