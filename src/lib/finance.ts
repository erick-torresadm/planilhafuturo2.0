import { daysInMonth, isoDate } from "./format";

export type GastoFixo = {
  id: string;
  categoria: string;
  descricao: string;
  valor: number;
  tipo: "P" | "A" | "C";
  frequencia: "mensal" | "anual";
  parcela_atual: number | null;
  parcela_total: number | null;
  dia: number;
  mes_anual: number | null;
  forma: string;
  ativo: boolean;
};

export type Parcela = {
  id: string;
  data: string;
  descricao: string;
  valor_total: number;
  qtd_parcelas: number;
  parcela_inicial: number;
  cartao: string | null;
  categoria: string | null;
};

export type Lancamento = {
  id: string;
  data: string;
  tipo: "entrada_fixa" | "entrada_diaria" | "saida_diaria";
  valor: number;
};

/** Shared helper: valor de uma parcela em um mês específico */
export function valorParcelaNoMes(p: Parcela, y: number, m0: number): number {
  const dt = new Date(p.data + "T00:00:00");
  const monthsAhead = (y - dt.getFullYear()) * 12 + (m0 - dt.getMonth());
  if (monthsAhead < 0) return 0;
  const restantes = p.qtd_parcelas - (p.parcela_inicial - 1);
  if (monthsAhead >= restantes) return 0;
  return Math.round(((Number(p.valor_total) || 0) / (Number(p.qtd_parcelas) || 1)) * 100) / 100;
}

/** Saídas fixas do dia D em mês M (0-11) ano Y */
export function saidaFixaDia(
  y: number,
  m0: number,
  d: number,
  gastos: GastoFixo[],
  parcelas: Parcela[],
): number {
  let s = 0;
  for (const g of gastos) {
    if (!g.ativo) continue;
    if (g.dia !== d) continue;
    if (g.frequencia === "anual") {
      if (g.mes_anual == null) continue;
      if (g.mes_anual - 1 !== m0) continue;
    }
    s += Number(g.valor) || 0;
  }
  for (const p of parcelas) {
    const diaParcela = new Date(p.data + "T00:00:00").getDate();
    if (d === diaParcela) {
      s += valorParcelaNoMes(p, y, m0);
    }
  }
  return s;
}

export type DiaFluxo = {
  data: string;
  dia: number;
  entradaFixa: number;
  entradaDiaria: number;
  saidaFixa: number;
  saidaDiaria: number;
  saldo: number;
};

export function computaMes(
  y: number,
  m0: number,
  saldoInicial: number,
  gastos: GastoFixo[],
  parcelas: Parcela[],
  lanc: Lancamento[],
): DiaFluxo[] {
  const dias = daysInMonth(y, m0);
  const out: DiaFluxo[] = [];
  let saldo = Number(saldoInicial) || 0;

  // Index lancamentos by date for O(1) lookup
  const lancByDate = new Map<string, Lancamento[]>();
  for (const l of lanc) {
    const arr = lancByDate.get(l.data);
    if (arr) arr.push(l);
    else lancByDate.set(l.data, [l]);
  }

  for (let d = 1; d <= dias; d++) {
    const data = isoDate(y, m0, d);
    const ls = lancByDate.get(data) || [];

    let entradaFixa = 0, entradaDiaria = 0, saidaDiaria = 0;
    for (const l of ls) {
      const v = Number(l.valor) || 0;
      if (l.tipo === "entrada_fixa") entradaFixa += v;
      else if (l.tipo === "entrada_diaria") entradaDiaria += v;
      else if (l.tipo === "saida_diaria") saidaDiaria += v;
    }

    const saidaFixa = saidaFixaDia(y, m0, d, gastos, parcelas);
    saldo = saldo + entradaFixa + entradaDiaria - saidaFixa - saidaDiaria;
    out.push({ data, dia: d, entradaFixa, entradaDiaria, saidaFixa, saidaDiaria, saldo });
  }
  return out;
}

export function totalGastoFixoMensal(gastos: GastoFixo[]): number {
  return gastos
    .filter((g) => g.ativo)
    .reduce((a, g) => a + (g.frequencia === "mensal" ? Number(g.valor) : Number(g.valor) / 12), 0);
}

export function parcelasNoMes(parcelas: Parcela[], y: number, m0: number): number {
  let s = 0;
  for (const p of parcelas) {
    s += valorParcelaNoMes(p, y, m0);
  }
  return s;
}
