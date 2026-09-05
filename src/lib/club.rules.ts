/**
 * Regras puras do PlanilhaClub. Sem I/O, sem Supabase, sem Efí — importável
 * tanto no servidor quanto no client. Toda regra de dinheiro/data do clube
 * mora aqui para ser testável e ter uma fonte só.
 */

export type ClubPlan = "start" | "premium";
export type ClubTier = ClubPlan | "none";
export type MembershipStatus = "pending" | "active" | "canceled" | "expired";
export type MembershipSource = "new" | "upgrade_from_avulsa" | "vitalicio_included";
export type BillingMethod = "a_vista" | "parcelado_12x";

export const VALOR_PLANILHA_AVULSA = 70;
export const DIAS_PERIODO = 365;
export const DIAS_AVISO_RENOVACAO = 7;
export const DIAS_REEMBOLSO = 7;
export const HORAS_PENDING = 24;

export const CLUB_PLANOS: Record<ClubPlan, { nome: string; valor: number; detalhe: string }> = {
  start: { nome: "PlanilhaClub Start", valor: 238.8, detalhe: "12x R$ 19,90 ou R$ 238,80 no Pix" },
  premium: {
    nome: "PlanilhaClub Premium",
    valor: 358.8,
    detalhe: "12x R$ 29,90 ou R$ 358,80 no Pix",
  },
};

const DIA_MS = 24 * 60 * 60 * 1000;

/** Preço cobrado no servidor. Só o Start desconta a planilha avulsa já paga. */
export function precoPlano(
  plan: ClubPlan,
  temPlanilhaAvulsa: boolean,
): { valor: number; source: MembershipSource } {
  if (plan === "start" && temPlanilhaAvulsa) {
    return {
      valor: Math.round((CLUB_PLANOS.start.valor - VALOR_PLANILHA_AVULSA) * 100) / 100,
      source: "upgrade_from_avulsa",
    };
  }
  return { valor: CLUB_PLANOS[plan].valor, source: "new" };
}

/** Novo período: começa no fim do anterior se ele ainda não passou, senão agora. */
export function calcularPeriodo(agora: Date, fimAnterior: Date | null): { start: Date; end: Date } {
  const start = fimAnterior && fimAnterior.getTime() > agora.getTime() ? fimAnterior : agora;
  return { start, end: new Date(start.getTime() + DIAS_PERIODO * DIA_MS) };
}

/** Mesma regra da função SQL club_tier(). */
export function deriveTier(
  ms: { plan: ClubPlan; status: MembershipStatus; current_period_end: string | null }[],
  agora: Date,
): ClubTier {
  const ativa = ms
    .filter(
      (m) =>
        m.status === "active" && m.current_period_end && new Date(m.current_period_end) > agora,
    )
    .sort(
      (a, b) =>
        new Date(b.current_period_end!).getTime() - new Date(a.current_period_end!).getTime(),
    )[0];
  return ativa ? ativa.plan : "none";
}

export function podeReembolsar(
  m: { source: MembershipSource; status: MembershipStatus; current_period_start: string | null },
  agora: Date,
): boolean {
  if (m.status !== "active" || m.source === "vitalicio_included" || !m.current_period_start)
    return false;
  // Janela fechada dos dois lados: um período que ainda não começou (renovação
  // antecipada) não é reembolsável agora. Reembolso após renovação antecipada só
  // atinge o período novo — o anterior já está `expired`.
  const dt = agora.getTime() - new Date(m.current_period_start).getTime();
  return dt >= 0 && dt <= DIAS_REEMBOLSO * DIA_MS;
}

export function precisaAvisoRenovacao(
  m: {
    status: MembershipStatus;
    cancel_renewal: boolean;
    renewal_notice_sent_at: string | null;
    current_period_end: string | null;
  },
  agora: Date,
): boolean {
  if (
    m.status !== "active" ||
    m.cancel_renewal ||
    m.renewal_notice_sent_at ||
    !m.current_period_end
  )
    return false;
  const restante = new Date(m.current_period_end).getTime() - agora.getTime();
  return restante > 0 && restante <= DIAS_AVISO_RENOVACAO * DIA_MS;
}

/** Nível mínimo de conteúdo (aulas, eventos). Cumulativo: free < start < premium. */
export type ContentTier = "free" | "start" | "premium";

export function tierRank(t: ClubTier | ContentTier): number {
  if (t === "premium") return 2;
  if (t === "start") return 1;
  return 0; // none, free
}

export function podeVer(tier: ClubTier, required: ContentTier): boolean {
  return tierRank(tier) >= tierRank(required);
}

/** URL colada pelo admin → URL de embed. Fora do padrão → null (não vira iframe). */
export function videoEmbedUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  let u: URL;
  try {
    u = new URL(url.trim());
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^www\./, "");
  if (host === "youtube.com" || host === "m.youtube.com") {
    const id = u.searchParams.get("v");
    return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
  }
  if (host === "youtu.be") {
    const id = u.pathname.slice(1).split("/")[0];
    return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
  }
  if (host === "vimeo.com") {
    const id = u.pathname.split("/").filter(Boolean)[0];
    return id && /^\d+$/.test(id) ? `https://player.vimeo.com/video/${id}` : null;
  }
  return null;
}
