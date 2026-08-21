export function brl(v: number | string | null | undefined): string {
  const n = typeof v === "string" ? num(v) : (v ?? 0);
  if (!isFinite(n)) return "R$ 0,00";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Formato compacto pra grids densos: 938 | 2,3K | -560 (sem R$, sem centavos). */
export function compactNum(v: number): string {
  const n = Math.round(v);
  const abs = Math.abs(n);
  if (abs >= 1000) {
    const k = n / 1000;
    return `${k.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}K`;
  }
  return n.toLocaleString("pt-BR");
}

/** Cor em heat-map (vermelho→cinza→verde) proporcional ao saldo dentro do range [min,max]. */
export function saldoHeat(v: number, min: number, max: number): { background: string; color: string } {
  if (v < 0) {
    const ratio = min < 0 ? Math.min(1, v / min) : 1;
    const alpha = 10 + ratio * 45;
    return {
      background: `color-mix(in oklab, var(--color-negative) ${alpha}%, var(--color-card))`,
      color: "var(--color-negative)",
    };
  }
  if (v === 0) return { background: "var(--color-muted)", color: "var(--color-muted-foreground)" };
  const ratio = max > 0 ? Math.min(1, v / max) : 0;
  const alpha = 10 + ratio * 50;
  return {
    background: `color-mix(in oklab, var(--color-positive) ${alpha}%, var(--color-card))`,
    color: "var(--color-positive)",
  };
}

export function num(v: unknown): number {
  if (v == null || v === "") return 0;
  if (typeof v === "number") return v;
  const s = String(v).replace(/\s/g, "").replace(/R\$/g, "").replace(/\./g, "").replace(",", ".");
  const n = Number(s);
  return isFinite(n) ? n : 0;
}

export const MESES = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];
export const MESES_ABREV = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

export function daysInMonth(year: number, month0: number): number {
  return new Date(year, Math.max(0, Math.min(11, month0)) + 1, 0).getDate();
}

export function monthKey(y: number, m0: number) {
  return `${y}-${String(m0 + 1).padStart(2, "0")}`;
}

export function isoDate(y: number, m0: number, d: number) {
  return `${y}-${String(m0 + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}
