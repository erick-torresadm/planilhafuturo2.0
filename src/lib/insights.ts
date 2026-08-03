/**
 * Conselheiro financeiro — motor de insights baseado em regras.
 *
 * Estuda a "planilha" do usuário (saldo, fluxo do dia, gastos fixos, parcelas,
 * investimentos, desejos) e devolve mensagens personalizadas, sem depender de
 * API externa: custo zero, instantâneo e sem enviar dados financeiros pra fora.
 *
 * O layout _authenticated/app.tsx computa os números e chama gerarInsights().
 */

import { brl } from "@/lib/format";

export interface AppDataForAI {
  nome: string;
  saldoHoje: number;
  saldoInicial: number;
  saldoFimMes: number;
  totalInvestido: number;
  totalEntradas: number;
  totalSaidas: number;
  gastosFixos: number; // total de gastos fixos no mês
  parcelasMes: number; // total de parcelas no mês
  rendaMensal: number;
  folgaHoje: number; // entradas de hoje - saídas de hoje
  mesesReserva: number; // meta de meses de reserva de emergência (perfil)
  primeiroNegativo: { label: string; saldo: number } | null;
  maiorDesejo: { item: string; valor: number } | null;
}

export type InsightTone = "danger" | "warning" | "positive" | "info";
export type InsightIcon = "alert" | "down" | "cash" | "shield" | "rocket" | "bulb" | "check";

export interface Insight {
  id: string;
  tone: InsightTone;
  icon: InsightIcon;
  title: string;
  desc: string;
  cta?: { label: string; to: string };
}

const DICAS = [
  "Gaste primeiro com Sobrevivência, depois Proteção, e só o que sobrar em Liberdade.",
  "Regra 50/30/20: até 50% em essencial, 30% em desejos, 20% em investimentos.",
  "Pague-se primeiro: no dia da renda, separe a parte de investir antes de gastar.",
  "Parcelas têm prazo: antes de parcelar, pergunte se a fatura caberia inteira no mês.",
  "Reserva de emergência é pra emergência — não pra viagem. Guarde separado.",
  "Revisar um gasto fixo por trimestre já economiza dezenas por mês.",
  "Um cafézinho em casa economiza mais do que você imagina — sem abrir mão dele.",
  "Antes de comprar por impulso, espere 48h. Se ainda quiser, compre sem culpa.",
  "Desejo não é urgência: caixinha cheia, compra à vista.",
  "Sua renda não define seu patrimônio — a diferença entre o que entra e o que fica define.",
];

const money = (n: number) => brl(Math.abs(Math.round(n)));

export function gerarInsights(d: AppDataForAI): Insight[] {
  const out: Insight[] = [];
  const nome = d.nome;

  const temDados =
    d.totalEntradas > 0 || d.totalSaidas > 0 || d.rendaMensal > 0 || d.saldoInicial !== 0 || d.totalInvestido > 0;

  if (!temDados) {
    out.push({
      id: "boas-vindas",
      tone: "info",
      icon: "bulb",
      title: "Me conta mais sobre você",
      desc: `${nome}, ainda não vejo movimentações na sua planilha. Adicione sua renda e seus gastos fixos que eu começo a te orientar todo dia.`,
      cta: { label: "Preencher perfil", to: "/config" },
    });
  }

  // 1. Negativo hoje
  if (d.saldoHoje < 0) {
    out.push({
      id: "negativo-hoje",
      tone: "danger",
      icon: "alert",
      title: "Você está no negativo",
      desc: `${nome}, hoje seu saldo é ${money(d.saldoHoje)} negativo. Sem pânico — vamos equilibrar as pontas: corte o não essencial hoje e, se der, antecipe uma entrada.`,
      cta: { label: "Ver fluxo de hoje", to: "/fluxo" },
    });
  }

  // 2. Mês fechando negativo
  if (d.saldoFimMes < 0) {
    out.push({
      id: "mes-negativo",
      tone: "danger",
      icon: "down",
      title: "O mês fecha no negativo",
      desc: `Se nada mudar, este mês termina em ${money(d.saldoFimMes)} negativo. Revisar um gasto fixo ou adiar uma parcela já ajuda a virar o jogo.`,
      cta: { label: "Revisar gastos fixos", to: "/gastos" },
    });
  }

  // 3. Primeiro negativo no horizonte de 12 meses
  if (d.primeiroNegativo && d.primeiroNegativo.saldo < 0) {
    out.push({
      id: "horizonte-negativo",
      tone: "warning",
      icon: "down",
      title: `Alerta em ${d.primeiroNegativo.label}`,
      desc: `Sua projeção aponta ${money(d.primeiroNegativo.saldo)} negativo em ${d.primeiroNegativo.label}. Dá pra evitar agindo agora: ajuste um fixo ou reduza uma parcela antes desse mês.`,
    });
  }

  // 4. Gastando mais do que ganha
  if (d.rendaMensal > 0 && d.totalSaidas > d.rendaMensal) {
    out.push({
      id: "gastos-acima-renda",
      tone: "warning",
      icon: "alert",
      title: "Você gasta mais do que ganha",
      desc: `${nome}, este mês as saídas (${money(d.totalSaidas)}) passam a renda (${money(d.rendaMensal)}). A diferença é ${money(d.totalSaidas - d.rendaMensal)} — bora cortar pra empatar.`,
      cta: { label: "Ver gastos", to: "/gastos" },
    });
  }

  // 5. Disponível hoje (quando está no azul)
  if (d.saldoHoje > 0 && d.saldoFimMes >= 0) {
    if (d.folgaHoje > 0) {
      const gastavel = Math.min(d.saldoHoje, d.folgaHoje);
      const sugestao = Math.round(gastavel * 0.5);
      const desejo = d.maiorDesejo ? ` — que tal reservar parte pra ${d.maiorDesejo.item}` : "";
      out.push({
        id: "disponivel-hoje",
        tone: "positive",
        icon: "cash",
        title: `Hoje dá pra usar até ${money(gastavel)}`,
        desc: `${nome}, depois das contas de hoje sobrou ${money(d.folgaHoje)}. Dá pra usar até ${money(sugestao)} com algo que você curte${desejo} — e deixar o resto de reserva.`,
        cta: d.maiorDesejo ? { label: "Ver desejos", to: "/desejos" } : undefined,
      });
    } else {
      out.push({
        id: "dia-de-segurar",
        tone: "warning",
        icon: "alert",
        title: "Hoje é dia de segurar",
        desc: `${nome}, você tem ${money(d.saldoHoje)} de saldo, mas as contas de hoje comem ${money(Math.abs(d.folgaHoje))} a mais do que entra. Evite gastos não essenciais hoje.`,
      });
    }
  }

  // 6. Reserva de emergência + investir
  const mesesAlvo = Math.max(d.mesesReserva || 6, 1);
  if (d.gastosFixos > 0) {
    const alvo = d.gastosFixos * mesesAlvo;
    if (d.totalInvestido < alvo) {
      const falta = alvo - d.totalInvestido;
      const mensal = Math.max(Math.round(falta / 12), 10);
      const cobertura = Math.floor(d.totalInvestido / d.gastosFixos);
      out.push({
        id: "reserva",
        tone: "info",
        icon: "shield",
        title: "Reserva de emergência em construção",
        desc: `${nome}, sua reserva cobre ${cobertura} meses dos ${mesesAlvo} recomendados. Faltam ${money(falta)}. Que tal guardar ${money(mensal)} por mês?`,
      });
    } else if (d.saldoFimMes > 0) {
      const sugestao = Math.round(d.saldoFimMes * 0.2);
      out.push({
        id: "reserva-pronta",
        tone: "positive",
        icon: "rocket",
        title: "Reserva pronta. Hora de crescer?",
        desc: `${nome}, sua reserva cobre ${mesesAlvo}+ meses. Com ${money(d.saldoFimMes)} sobrando no mês, que tal investir ${money(sugestao)} com mais ousadia?`,
        cta: { label: "Ver investimentos", to: "/investimentos" },
      });
    }
  }

  // 7. Sobrou no mês
  if (d.saldoFimMes > 0 && !out.some((i) => i.id === "reserva-pronta")) {
    out.push({
      id: "sobra-mes",
      tone: "positive",
      icon: "check",
      title: `Sobrou ${money(d.saldoFimMes)} no mês`,
      desc: `${nome}, com tudo o que já está lançado, este mês sobra ${money(d.saldoFimMes)}. Separe 10% (${money(Math.round(d.saldoFimMes * 0.1))}) pra investir antes de gastar — pague-se primeiro.`,
    });
  }

  // Mantém no máximo 4 insights + a dica do dia
  const core = out.slice(0, 4);
  const dia = Math.floor(Date.now() / 86400000);
  core.push({
    id: "dica",
    tone: "info",
    icon: "bulb",
    title: "Dica do dia",
    desc: DICAS[dia % DICAS.length],
  });

  return core;
}
