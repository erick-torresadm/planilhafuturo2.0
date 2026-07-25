import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/** Formata número em BRL sem símbolo (ex.: 1234.5 -> "1.234,50"). */
function fmt(n: number): string {
  if (!isFinite(n) || n === 0) return "";
  return n.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Aceita "1.234,56", "1234.56", "1234,5", "R$ 12,34" → number */
function parse(s: string): number {
  if (!s) return 0;
  const clean = s
    .replace(/\s/g, "")
    .replace(/R\$/gi, "")
    .replace(/\./g, "")
    .replace(",", ".");
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
  /** Se true, mostra prefixo "R$" mesmo quando vazio. */
  alwaysShowPrefix?: boolean;
};

/**
 * Input de valor em Reais com prefixo "R$" visível e formatação BR ao sair.
 * Mantém padrão spreadsheet: bordas leves, tabular-nums.
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

  useEffect(() => {
    if (!focused) setTxt(fmt(Number(value) || 0));
  }, [value, focused]);

  const showPrefix = alwaysShowPrefix || txt.length > 0 || focused;
  const alignCls =
    align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";
  const sizeCls =
    size === "sm" ? "h-8 text-sm" : size === "lg" ? "h-11 text-lg" : "h-9 text-sm";

  return (
    <div
      className={cn(
        "relative inline-flex items-center rounded-md bg-transparent",
        "focus-within:ring-1 focus-within:ring-primary/60 focus-within:bg-primary/[0.03]",
        "transition-colors",
        disabled && "opacity-60",
        className
      )}
    >
      {showPrefix && (
        <span
          className={cn(
            "pointer-events-none select-none pl-2 pr-1 text-[11px] font-semibold uppercase tracking-wider",
            focused ? "text-primary" : "text-muted-foreground"
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
          // seleciona conteúdo pra facilitar sobrescrita
          requestAnimationFrame(() => e.target.select());
        }}
        onChange={(e) => {
          // aceita apenas dígitos, vírgula, ponto, sinal
          const raw = e.target.value.replace(/[^\d.,-]/g, "");
          setTxt(raw);
        }}
        onBlur={() => {
          setFocused(false);
          const n = parse(txt);
          setTxt(fmt(n));
          if (n !== Number(value)) onCommit(n);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            (e.target as HTMLInputElement).blur();
          } else if (e.key === "Escape") {
            setTxt(fmt(Number(value) || 0));
            (e.target as HTMLInputElement).blur();
          }
        }}
        className={cn(
          "flex-1 min-w-0 bg-transparent outline-none px-2 tabular-nums font-medium",
          alignCls,
          sizeCls,
          inputClassName
        )}
      />
    </div>
  );
}
