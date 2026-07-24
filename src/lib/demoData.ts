/**
 * Dados de demonstração genéricos usados como fallback
 * enquanto a autenticação está desligada para testes.
 *
 * Categoria de pilar:
 *   S = Sobrevivência   (essencial: moradia, saúde, transporte, contas básicas)
 *   P = Proteção        (seguros, reserva, investimentos base)
 *   L = Liberdade       (lazer, streaming, hobbies, desejos)
 */

export type Pilar = "S" | "P" | "L";

export const DEMO_PROFILE = {
  nome: "Você",
  renda_mensal: 7000,
  saldo_inicial: 0,
  meses_reserva_emergencia: 6,
  meses_reserva_desejada: 12,
};

export type DemoGasto = {
  id: string;
  categoria: string;
  descricao: string;
  valor: number;
  pilar: Pilar;
  frequencia: "mensal" | "anual";
  dia: number;
  mes_anual?: number;
  forma: string;
  ativo: boolean;
};

export const DEMO_GASTOS: DemoGasto[] = [
  { id: "g1", categoria: "Moradia",    descricao: "Internet",        valor: 130,    pilar: "S", frequencia: "mensal", dia: 1,  forma: "Pix",    ativo: true },
  { id: "g2", categoria: "Telefonia",  descricao: "Celular",         valor: 51.8,   pilar: "S", frequencia: "mensal", dia: 1,  forma: "Cartão", ativo: true },
  { id: "g3", categoria: "Saúde",      descricao: "Plano de saúde",  valor: 311.57, pilar: "S", frequencia: "mensal", dia: 1,  forma: "Cartão", ativo: true },
  { id: "g4", categoria: "Saúde",      descricao: "Plano odontológico", valor: 150, pilar: "S", frequencia: "mensal", dia: 1,  forma: "Pix",    ativo: true },
  { id: "g5", categoria: "Saúde",      descricao: "Academia",        valor: 140,    pilar: "S", frequencia: "mensal", dia: 16, forma: "Cartão", ativo: true },
  { id: "g6", categoria: "Lazer",      descricao: "Streaming",       valor: 60,     pilar: "L", frequencia: "mensal", dia: 16, forma: "Cartão", ativo: true },
  { id: "g7", categoria: "Lazer",      descricao: "Streaming música", valor: 17,    pilar: "L", frequencia: "mensal", dia: 7,  forma: "Cartão", ativo: true },
  { id: "g8", categoria: "Lazer",      descricao: "Nuvem",           valor: 66.9,   pilar: "L", frequencia: "mensal", dia: 29, forma: "Cartão", ativo: true },
  { id: "g9", categoria: "Lazer",      descricao: "Assistente IA",   valor: 114.34, pilar: "L", frequencia: "anual",  dia: 31, mes_anual: 1, forma: "Cartão", ativo: true },
  { id: "g10", categoria: "Transporte", descricao: "Carro",          valor: 1800,   pilar: "S", frequencia: "mensal", dia: 1,  forma: "Débito", ativo: true },
  { id: "g11", categoria: "Imposto",    descricao: "IPTU",           valor: 188.17, pilar: "S", frequencia: "anual",  dia: 8, mes_anual: 3, forma: "Boleto", ativo: true },
];

export type DemoParcela = {
  id: string;
  data: string;
  descricao: string;
  valor_total: number;
  qtd_parcelas: number;
  parcela_inicial: number; // qual parcela é ESSA (1 = primeira do plano)
  cartao: string;
  categoria: string;
};

// Datas ajustadas para 2026-07 (janela atual da planilha)
export const DEMO_PARCELAS: DemoParcela[] = [
  { id: "p1",  data: "2026-07-20", descricao: "Pet shop",             valor_total: 3600,   qtd_parcelas: 5,  parcela_inicial: 1, cartao: "Cartão 1", categoria: "Casa" },
  { id: "p2",  data: "2026-07-24", descricao: "Manutenção veículo",   valor_total: 1740.2, qtd_parcelas: 10, parcela_inicial: 2, cartao: "Cartão 1", categoria: "Transporte" },
  { id: "p3",  data: "2026-07-11", descricao: "Compra online",        valor_total: 538.9,  qtd_parcelas: 10, parcela_inicial: 1, cartao: "Cartão 2", categoria: "Compras" },
  { id: "p4",  data: "2026-07-12", descricao: "Compra online 2",      valor_total: 335.72, qtd_parcelas: 7,  parcela_inicial: 1, cartao: "Cartão 2", categoria: "Compras" },
  { id: "p5",  data: "2026-07-14", descricao: "Eletrodoméstico",      valor_total: 3046.4, qtd_parcelas: 10, parcela_inicial: 8, cartao: "Cartão 1", categoria: "Casa" },
  { id: "p6",  data: "2026-07-12", descricao: "Filtro de água",       valor_total: 513.72, qtd_parcelas: 12, parcela_inicial: 7, cartao: "Cartão 1", categoria: "Casa" },
  { id: "p7",  data: "2026-07-12", descricao: "Assinatura serviço",   valor_total: 120,    qtd_parcelas: 12, parcela_inicial: 7, cartao: "Cartão 1", categoria: "Casa" },
  { id: "p8",  data: "2026-07-08", descricao: "Equipamento tech",     valor_total: 1498.77,qtd_parcelas: 10, parcela_inicial: 7, cartao: "Cartão 1", categoria: "Tecnologia" },
  { id: "p9",  data: "2026-07-28", descricao: "Reforma quarto",       valor_total: 3277.2, qtd_parcelas: 12, parcela_inicial: 7, cartao: "Cartão 1", categoria: "Casa" },
  { id: "p10", data: "2026-07-26", descricao: "Compra online 3",      valor_total: 295,    qtd_parcelas: 6,  parcela_inicial: 3, cartao: "Cartão 1", categoria: "Compras" },
];

export const DEMO_INVEST = [
  { id: "i1", data: "2026-07-21", nome: "Fundo Investimento 1", tipo: "Fundo", renda: "Pós-Fixado",  valor_aplicado: 326.81,  posicao_atual: 352.82,   vencimento: "Resgate D+0" },
  { id: "i2", data: "2026-04-22", nome: "CDB Banco A",          tipo: "CDB",   renda: "100,25% CDI", valor_aplicado: 22000,   posicao_atual: 22750.85, vencimento: "22/04/2027" },
  { id: "i3", data: "2026-06-23", nome: "CDB Banco B",          tipo: "CDB",   renda: "100% CDI",    valor_aplicado: 1851,    posicao_atual: 1870.54,  vencimento: "23/06/2028" },
  { id: "i4", data: "2026-07-03", nome: "CDB Banco B",          tipo: "CDB",   renda: "100% CDI",    valor_aplicado: 8500,    posicao_atual: 8558.23,  vencimento: "03/07/2028" },
];

export const DEMO_DESEJOS = [
  { id: "d1", item: "Monitor novo",       valor: 2500, tipo: "Tecnologia", parcelado: false, parcelas: 0, obs: "Trabalho/escritório" },
  { id: "d2", item: "Smartphone novo",    valor: 6500, tipo: "Tecnologia", parcelado: false, parcelas: 0, obs: "Trocar atual" },
  { id: "d3", item: "Viagem exterior",    valor: 8000, tipo: "Lazer",      parcelado: false, parcelas: 0, obs: "Férias" },
  { id: "d4", item: "Notebook novo",      valor: 5000, tipo: "Tecnologia", parcelado: true,  parcelas: 10, obs: "Se parcela cabe no orçamento" },
  { id: "d5", item: "Sofá",               valor: 3000, tipo: "Casa",       parcelado: true,  parcelas: 6,  obs: "Ver se parcela cabe" },
  { id: "d6", item: "Curso online",       valor: 800,  tipo: "Educação",   parcelado: false, parcelas: 0, obs: "Investimento pessoal" },
];

/** Agrega gastos por pilar (mensal equivalente) */
export function totaisPorPilar(gastos: DemoGasto[]) {
  const acc = { S: 0, P: 0, L: 0 };
  for (const g of gastos) {
    if (!g.ativo) continue;
    const m = g.frequencia === "mensal" ? g.valor : g.valor / 12;
    acc[g.pilar] += m;
  }
  return acc;
}
