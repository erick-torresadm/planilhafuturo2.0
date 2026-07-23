import { daysInMonth, isoDate } from "./format";

export type GastoFixo = {
  id: string;
  categoria: string;
  descricao: string;
  valor: number;
  tipo: string; // P|A|C
  frequencia: string; // mensal|anual
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
    if (g.frequencia === "anual" && g.mes_anual && g.mes_anual - 1 !== m0) continue;
    s += Number(g.valor) || 0;
  }
  for (const p of parcelas) {
    const dt = new Date(p.data + "T00:00:00");
    if (dt.getDate() !== d) continue;
    const startY = dt.getFullYear();
    const startM = dt.getMonth();
    const monthsAhead = (y - startY) * 12 + (m0 - startM);
    if (monthsAhead < 0) continue;
    const restantes = p.qtd_parcelas - (p.parcela_inicial - 1);
    if (monthsAhead >= restantes) continue;
    s += (Number(p.valor_total) || 0) / (Number(p.qtd_parcelas) || 1);
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
  let saldo = saldoInicial;
  for (let d = 1; d <= dias; d++) {
    const data = isoDate(y, m0, d);
    const ls = lanc.filter((l) => l.data === data);
    const entradaFixa = ls.filter((l) => l.tipo === "entrada_fixa").reduce((a, b) => a + Number(b.valor), 0);
    const entradaDiaria = ls.filter((l) => l.tipo === "entrada_diaria").reduce((a, b) => a + Number(b.valor), 0);
    const saidaDiaria = ls.filter((l) => l.tipo === "saida_diaria").reduce((a, b) => a + Number(b.valor), 0);
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
    const dt = new Date(p.data + "T00:00:00");
    const monthsAhead = (y - dt.getFullYear()) * 12 + (m0 - dt.getMonth());
    if (monthsAhead < 0) continue;
    const restantes = p.qtd_parcelas - (p.parcela_inicial - 1);
    if (monthsAhead >= restantes) continue;
    s += (Number(p.valor_total) || 0) / (Number(p.qtd_parcelas) || 1);
  }
  return s;
}
