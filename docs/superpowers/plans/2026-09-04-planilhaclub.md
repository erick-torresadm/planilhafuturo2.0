# PlanilhaClub MVP — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Camada de comunidade paga (PlanilhaClub Start/Premium) por cima do planilhafuturo: memberships anuais pagas via Efí, gate `/club`, feed público/fechado, eventos com RSVP, renovação assistida por cron, moderação pelo admin.

**Architecture:** Entitlement derivado de uma função SQL `club_tier(uid)` usada pela RLS e pelas server functions (nenhuma coluna duplicada). Toda leitura e escrita do clube passa por server functions TanStack Start (`src/lib/club.functions.ts`) com service role; a RLS é defesa em profundidade. Pagamento reusa `efi-service.ts` (Pix e cartão com parcelas); Premium também grava em `assinaturas`, então o gate atual do app (`getSubscriptionStatus`) libera sem mudança.

**Tech Stack:** React 19 + TanStack Start/Router (file-based), TanStack Query, Supabase (Postgres + RLS, service role no servidor), Efí Pagamentos (`efi-service.ts`), Tailwind v4, `motion/react`, lucide-react, sonner.

Spec: `docs/superpowers/specs/2026-09-04-planilhaclub-design.md`.

## Global Constraints

- Preços: Start `238.80`, Premium `358.80`, planilha avulsa `70` → upgrade avulsa→Start `168.80`. Período `365` dias. Aviso de renovação `7` dias antes. Reembolso até `7` dias após `current_period_start`. Pix pendente expira em `24` horas.
- Preço e tier são sempre calculados no servidor. O client envia apenas `plan` e `metodo`.
- Server functions de pagamento devolvem `{ ok: false, error }`; nunca lançam pela RPC.
- Nomes de plano gravados em `assinaturas.plano` e em `notificacoes`: `"PlanilhaClub Premium"`, `"PlanilhaClub Start"`.
- Migrations aplicadas pelo fluxo atual do projeto (SQL editor do Supabase ou `supabase db push`). **Não** usar os MCPs Supabase desta máquina — apontam para outros projetos.
- `checkout.tsx` (pré-cadastro) não é alterado nesta sprint.
- Grátis (`club_tier = 'none'`): só leitura do canal público e eventos públicos; sem post, sem RSVP, sem Excel.
- Lint antes de cada commit: `bunx eslint <arquivos> --fix`. Erros `no-explicit-any` são convenção do repo e aceitos; qualquer outro erro é bloqueante.
- Sem test runner no repo. Regras puras verificadas com `bun scripts/check-club-rules.ts` (assertions do `node:assert`). Rotas verificadas com `curl -s -o /dev/null -w "%{http_code}" http://localhost:5184/<rota>` (dev server já roda na 5184; se não, `bun run vite dev --port 5184`).
- Commits terminam com `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.

---

## File map

| Arquivo | Responsabilidade |
|---|---|
| `supabase/migrations/009_planilhaclub.sql` (novo) | Tabelas do clube, `club_tier()`, RLS |
| `src/lib/club.rules.ts` (novo) | Regras puras: preços, tier, datas. Sem I/O. Importável no client. |
| `scripts/check-club-rules.ts` (novo) | Assertions das regras puras |
| `src/lib/club.functions.ts` (novo) | Server functions: status, checkout, ativação, casos especiais, cancelamento, reembolso, cron de renovação, feed, eventos |
| `src/lib/assinatura.functions.ts` (modificar) | Exportar `upsertAssinatura` |
| `src/lib/push.functions.ts` (modificar) | Ampliar `EventoTipo`; chamar passo do clube no cron |
| `src/lib/planilha-compra.functions.ts` (modificar) | Importar `VALOR_PLANILHA_AVULSA` de `club.rules.ts` |
| `src/components/CheckoutForm.tsx` (novo) | UI de pagamento Pix/cartão reutilizável (extraída de `checkout.tsx`) |
| `src/routes/club.assinar.tsx` (novo) | `/club/assinar?plan=` fora do paywall |
| `src/routes/_authenticated/club.tsx` (novo) | `/club`: gate, feed, eventos, moderação |
| `src/components/AppShellV2.tsx` (modificar) | "Clube" na navegação |
| `src/routes/_authenticated/config.tsx` (modificar) | Card PRO Anual → PlanilhaClub Premium |
| `src/components/Paywall.tsx` (modificar) | CTA → `/club/assinar?plan=premium` |
| `vercel.json` (modificar) | Rewrites por host para `club.planilhafuturo.com.br` |

---

### Task 1: Migration — tabelas, `club_tier()`, RLS

**Files:**
- Create: `supabase/migrations/009_planilhaclub.sql`

**Interfaces:**
- Produces: tabelas `club_memberships`, `club_posts`, `club_events`, `club_event_rsvps`; função `club_tier(uid uuid) returns text` (`'premium' | 'start' | 'none'`).

- [ ] **Step 1: Escrever a migration**

```sql
-- 009_planilhaclub.sql — PlanilhaClub: memberships, feed, eventos, entitlement.

CREATE TABLE IF NOT EXISTS club_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plan TEXT NOT NULL CHECK (plan IN ('start','premium')),
  status TEXT NOT NULL CHECK (status IN ('pending','active','canceled','expired')),
  source TEXT NOT NULL CHECK (source IN ('new','upgrade_from_avulsa','vitalicio_included')),
  billing_method TEXT CHECK (billing_method IN ('a_vista','parcelado_12x')),
  gateway_txid TEXT,
  valor_pago NUMERIC,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_renewal BOOLEAN NOT NULL DEFAULT false,
  renewal_notice_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS club_memberships_one_active
  ON club_memberships (user_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_club_memberships_user ON club_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_club_memberships_txid ON club_memberships(gateway_txid);

CREATE TABLE IF NOT EXISTS club_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('public','closed')),
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 2000),
  pinned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_club_posts_channel_created ON club_posts(channel, created_at DESC);

CREATE TABLE IF NOT EXISTS club_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('call','desafio')),
  description TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  tier_required TEXT NOT NULL DEFAULT 'start' CHECK (tier_required IN ('free','start','premium')),
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_club_events_scheduled ON club_events(scheduled_at);

-- Aulas: video embed (YouTube/Vimeo) + texto, nivel minimo cumulativo.
CREATE TABLE IF NOT EXISTS club_lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT,
  tier_required TEXT NOT NULL DEFAULT 'start' CHECK (tier_required IN ('free','start','premium')),
  modulo TEXT,
  ordem INTEGER NOT NULL DEFAULT 0,
  published BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_club_lessons_modulo_ordem ON club_lessons(modulo, ordem);

-- Ordem dos niveis: none/free = 0, start = 1, premium = 2.
CREATE OR REPLACE FUNCTION club_tier_rank(t TEXT) RETURNS INTEGER
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE t WHEN 'premium' THEN 2 WHEN 'start' THEN 1 ELSE 0 END;
$$;
GRANT EXECUTE ON FUNCTION club_tier_rank(TEXT) TO authenticated;

CREATE TABLE IF NOT EXISTS club_event_rsvps (
  event_id UUID NOT NULL REFERENCES club_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (event_id, user_id)
);

-- Entitlement: uma fonte só, usada por RLS e server fns.
CREATE OR REPLACE FUNCTION club_tier(uid UUID) RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT plan FROM club_memberships
      WHERE user_id = uid AND status = 'active' AND current_period_end > now()
      ORDER BY current_period_end DESC LIMIT 1),
    'none');
$$;
GRANT EXECUTE ON FUNCTION club_tier(UUID) TO authenticated;

ALTER TABLE club_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_event_rsvps ENABLE ROW LEVEL SECURITY;

-- Acesso de tabela explicito (padrao do repo): anon nunca; service role ignora RLS e grants.
REVOKE ALL ON club_memberships, club_posts, club_events, club_lessons, club_event_rsvps FROM anon;
GRANT SELECT ON club_memberships, club_events, club_lessons TO authenticated;
GRANT SELECT, INSERT, DELETE ON club_posts, club_event_rsvps TO authenticated;

-- memberships: usuário lê só as próprias; escrita só service role (sem policy de insert/update).
CREATE POLICY club_memberships_read_own ON club_memberships
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- posts: público para logado; fechado só membro; insert só membro; delete só o próprio.
CREATE POLICY club_posts_read ON club_posts
  FOR SELECT TO authenticated USING (
    channel = 'public' OR club_tier(auth.uid()) <> 'none'
  );
CREATE POLICY club_posts_insert_member ON club_posts
  FOR INSERT TO authenticated WITH CHECK (
    author_id = auth.uid() AND club_tier(auth.uid()) <> 'none'
  );
CREATE POLICY club_posts_delete_own ON club_posts
  FOR DELETE TO authenticated USING (author_id = auth.uid());

-- events e lessons: nivel do usuario >= nivel exigido. Sem escrita por usuário.
CREATE POLICY club_events_read ON club_events
  FOR SELECT TO authenticated USING (
    club_tier_rank(club_tier(auth.uid())) >= club_tier_rank(tier_required)
  );
CREATE POLICY club_lessons_read ON club_lessons
  FOR SELECT TO authenticated USING (
    published AND club_tier_rank(club_tier(auth.uid())) >= club_tier_rank(tier_required)
  );

-- rsvps: só as próprias, só em evento visível e só membro.
CREATE POLICY club_rsvps_read_own ON club_event_rsvps
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY club_rsvps_insert_member ON club_event_rsvps
  FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = user_id
    AND club_tier(auth.uid()) <> 'none'
    AND EXISTS (SELECT 1 FROM club_events e WHERE e.id = event_id)
  );
CREATE POLICY club_rsvps_delete_own ON club_event_rsvps
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
```

- [ ] **Step 2: Aplicar no projeto Supabase do planilhafuturo**

Cole o arquivo no SQL editor do projeto (ou `supabase db push` se a CLI estiver linkada ao projeto certo). Confirme o projeto pelo `VITE_SUPABASE_URL` do `.env` antes de rodar.

- [ ] **Step 3: Verificar**

No SQL editor:

```sql
SELECT club_tier('00000000-0000-0000-0000-000000000000'::uuid); -- esperado: 'none'
SELECT tablename FROM pg_tables WHERE tablename LIKE 'club_%'; -- 5 linhas
SELECT club_tier_rank('none'), club_tier_rank('start'), club_tier_rank('premium'); -- 0 1 2
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/009_planilhaclub.sql
git commit -m "feat(club): migration do PlanilhaClub — memberships, feed, eventos, club_tier e RLS

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2: Regras puras — `club.rules.ts`

**Files:**
- Create: `src/lib/club.rules.ts`
- Create: `scripts/check-club-rules.ts`
- Modify: `src/lib/planilha-compra.functions.ts:9` (importar constante)

**Interfaces:**
- Produces:
  - `type ClubPlan = "start" | "premium"`, `type ClubTier = ClubPlan | "none"`, `type MembershipStatus = "pending" | "active" | "canceled" | "expired"`, `type MembershipSource = "new" | "upgrade_from_avulsa" | "vitalicio_included"`, `type BillingMethod = "a_vista" | "parcelado_12x"`
  - `CLUB_PLANOS: Record<ClubPlan, { nome: string; valor: number; detalhe: string }>`
  - `VALOR_PLANILHA_AVULSA = 70`, `DIAS_PERIODO = 365`, `DIAS_AVISO_RENOVACAO = 7`, `DIAS_REEMBOLSO = 7`, `HORAS_PENDING = 24`
  - `precoPlano(plan: ClubPlan, temPlanilhaAvulsa: boolean): { valor: number; source: MembershipSource }`
  - `calcularPeriodo(agora: Date, fimAnterior: Date | null): { start: Date; end: Date }`
  - `deriveTier(ms: { plan: ClubPlan; status: MembershipStatus; current_period_end: string | null }[], agora: Date): ClubTier`
  - `podeReembolsar(m: { source: MembershipSource; status: MembershipStatus; current_period_start: string | null }, agora: Date): boolean`
  - `precisaAvisoRenovacao(m: { status: MembershipStatus; cancel_renewal: boolean; renewal_notice_sent_at: string | null; current_period_end: string | null }, agora: Date): boolean`
  - `type ContentTier = "free" | "start" | "premium"`, `tierRank(t: ClubTier | ContentTier): number` (none/free 0, start 1, premium 2), `podeVer(tier: ClubTier, required: ContentTier): boolean`
  - `videoEmbedUrl(url: string | null | undefined): string | null` — YouTube (`watch?v=`, `youtu.be/`) → `https://www.youtube-nocookie.com/embed/<id>`; Vimeo (`vimeo.com/<id>`) → `https://player.vimeo.com/video/<id>`; outro → `null`

- [ ] **Step 1: Escrever as assertions (falham: módulo não existe)**

`scripts/check-club-rules.ts`:

```ts
import assert from "node:assert/strict";
import {
  precoPlano,
  calcularPeriodo,
  deriveTier,
  podeReembolsar,
  precisaAvisoRenovacao,
  podeVer,
  videoEmbedUrl,
  CLUB_PLANOS,
  VALOR_PLANILHA_AVULSA,
} from "../src/lib/club.rules";

const dia = 24 * 60 * 60 * 1000;
const agora = new Date("2026-09-04T12:00:00Z");
const iso = (d: Date) => d.toISOString();

// preços
assert.deepEqual(precoPlano("start", false), { valor: 238.8, source: "new" });
assert.deepEqual(precoPlano("start", true), { valor: 168.8, source: "upgrade_from_avulsa" });
assert.deepEqual(precoPlano("premium", false), { valor: 358.8, source: "new" });
assert.deepEqual(precoPlano("premium", true), { valor: 358.8, source: "new" });
assert.equal(CLUB_PLANOS.start.valor - VALOR_PLANILHA_AVULSA, 168.8);

// período: novo começa agora; renovação antes do fim começa no fim anterior
let p = calcularPeriodo(agora, null);
assert.equal(iso(p.start), iso(agora));
assert.equal(p.end.getTime() - p.start.getTime(), 365 * dia);
const fimFuturo = new Date(agora.getTime() + 3 * dia);
p = calcularPeriodo(agora, fimFuturo);
assert.equal(iso(p.start), iso(fimFuturo));
const fimPassado = new Date(agora.getTime() - 3 * dia);
p = calcularPeriodo(agora, fimPassado);
assert.equal(iso(p.start), iso(agora));

// tier
assert.equal(deriveTier([], agora), "none");
assert.equal(
  deriveTier([{ plan: "start", status: "active", current_period_end: iso(fimFuturo) }], agora),
  "start",
);
assert.equal(
  deriveTier([{ plan: "premium", status: "active", current_period_end: iso(fimPassado) }], agora),
  "none",
);
assert.equal(
  deriveTier([{ plan: "premium", status: "pending", current_period_end: iso(fimFuturo) }], agora),
  "none",
);

// reembolso: 7 dias, só origem paga, só ativa
const inicioRecente = iso(new Date(agora.getTime() - 2 * dia));
const inicioAntigo = iso(new Date(agora.getTime() - 8 * dia));
assert.equal(podeReembolsar({ source: "new", status: "active", current_period_start: inicioRecente }, agora), true);
assert.equal(podeReembolsar({ source: "new", status: "active", current_period_start: inicioAntigo }, agora), false);
assert.equal(podeReembolsar({ source: "vitalicio_included", status: "active", current_period_start: inicioRecente }, agora), false);
assert.equal(podeReembolsar({ source: "new", status: "canceled", current_period_start: inicioRecente }, agora), false);

// aviso de renovação: ativa, sem cancelamento, sem aviso ainda, fim em ≤ 7 dias
const base = { status: "active" as const, cancel_renewal: false, renewal_notice_sent_at: null };
assert.equal(precisaAvisoRenovacao({ ...base, current_period_end: iso(new Date(agora.getTime() + 6 * dia)) }, agora), true);
assert.equal(precisaAvisoRenovacao({ ...base, current_period_end: iso(new Date(agora.getTime() + 8 * dia)) }, agora), false);
assert.equal(precisaAvisoRenovacao({ ...base, cancel_renewal: true, current_period_end: iso(new Date(agora.getTime() + 6 * dia)) }, agora), false);
assert.equal(precisaAvisoRenovacao({ ...base, renewal_notice_sent_at: iso(agora), current_period_end: iso(new Date(agora.getTime() + 6 * dia)) }, agora), false);

// níveis cumulativos
assert.equal(podeVer("none", "free"), true);
assert.equal(podeVer("none", "start"), false);
assert.equal(podeVer("start", "start"), true);
assert.equal(podeVer("start", "premium"), false);
assert.equal(podeVer("premium", "free"), true);
assert.equal(podeVer("premium", "premium"), true);

// embed
assert.equal(videoEmbedUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=1s"), "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
assert.equal(videoEmbedUrl("https://youtu.be/dQw4w9WgXcQ"), "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
assert.equal(videoEmbedUrl("https://vimeo.com/123456789"), "https://player.vimeo.com/video/123456789");
assert.equal(videoEmbedUrl("https://example.com/x"), null);
assert.equal(videoEmbedUrl(null), null);

console.log("club.rules ok");
```

- [ ] **Step 2: Rodar para ver falhar**

Run: `bun scripts/check-club-rules.ts`
Expected: erro `Cannot find module '../src/lib/club.rules'`.

- [ ] **Step 3: Implementar `src/lib/club.rules.ts`**

```ts
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
  premium: { nome: "PlanilhaClub Premium", valor: 358.8, detalhe: "12x R$ 29,90 ou R$ 358,80 no Pix" },
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
    .filter((m) => m.status === "active" && m.current_period_end && new Date(m.current_period_end) > agora)
    .sort((a, b) => new Date(b.current_period_end!).getTime() - new Date(a.current_period_end!).getTime())[0];
  return ativa ? ativa.plan : "none";
}

export function podeReembolsar(
  m: { source: MembershipSource; status: MembershipStatus; current_period_start: string | null },
  agora: Date,
): boolean {
  if (m.status !== "active" || m.source === "vitalicio_included" || !m.current_period_start) return false;
  return agora.getTime() - new Date(m.current_period_start).getTime() <= DIAS_REEMBOLSO * DIA_MS;
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
  if (m.status !== "active" || m.cancel_renewal || m.renewal_notice_sent_at || !m.current_period_end) return false;
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
```

- [ ] **Step 4: Rodar as assertions**

Run: `bun scripts/check-club-rules.ts`
Expected: `club.rules ok`.

- [ ] **Step 5: Apontar `planilha-compra.functions.ts` para a constante**

Em `src/lib/planilha-compra.functions.ts`, trocar a linha 9:

```ts
const VALOR_PLANILHA = 70;
```

por:

```ts
import { VALOR_PLANILHA_AVULSA as VALOR_PLANILHA } from "./club.rules";
```

(mover o import para o bloco de imports no topo do arquivo).

- [ ] **Step 6: Lint e commit**

```bash
bunx eslint src/lib/club.rules.ts src/lib/planilha-compra.functions.ts scripts/check-club-rules.ts --fix
git add src/lib/club.rules.ts scripts/check-club-rules.ts src/lib/planilha-compra.functions.ts
git commit -m "feat(club): regras puras do PlanilhaClub (precos, periodo, tier, reembolso, aviso)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 3: Server functions de membership — status, checkout, ativação, casos especiais

**Files:**
- Create: `src/lib/club.functions.ts`
- Modify: `src/lib/assinatura.functions.ts:30` (`async function upsertAssinatura` → `export async function upsertAssinatura`)
- Modify: `src/lib/push.functions.ts:58` (ampliar `EventoTipo`)

**Interfaces:**
- Consumes: `club.rules.ts` (Task 2); `createPixCharge(valor, descricao)`, `checkPixStatus(txid)`, `createCreditCardCharge(valor, descricao, card: CreditCardRequest)` de `efi-service.ts`; `getAuthedUser()` de `server-session.ts`; `registrarEvento(...)` de `push.functions.ts`; `upsertAssinatura(userId, planoNome)` de `assinatura.functions.ts`.
- Produces (usadas nas Tasks 4–6):
  - `type ClubStatus = { tier: ClubTier; membership: MembershipRow | null; ofertas: { start: number; premium: number; upgradeAvulsa: boolean; vitalicioDisponivel: boolean }; avisoRenovacao: boolean; podeReembolsar: boolean; isAdmin: boolean }`
  - `getClubStatus(): Promise<ClubStatus>`
  - `criarAssinaturaClube({ data: { plan, metodo: "pix" } })` → `{ ok: true; metodo: "pix"; txid; pixCopiaECola; qrcode; valor } | { ok: false; error }`
  - `criarAssinaturaClube({ data: { plan, metodo: "cartao", paymentToken, customerName, customerCpf, customerPhone, installments } })` → `{ ok: true; metodo: "cartao"; paid: boolean; message?: string } | { ok: false; error }`
  - `verificarAssinaturaClube({ data: { txid } })` → `{ ok: true } | { ok: false; error }`
  - `ativarVitalicioClube()`, `cancelarRenovacaoClube()`, `solicitarReembolso()` → `{ ok: true } | { ok: false; error }`

- [ ] **Step 1: Exportar `upsertAssinatura` e ampliar `EventoTipo`**

`src/lib/assinatura.functions.ts` linha 30:

```ts
export async function upsertAssinatura(userId: string, planoNome: string) {
```

`src/lib/push.functions.ts` linha 58:

```ts
export type EventoTipo =
  | "cadastro"
  | "pagamento"
  | "compra"
  | "positivo"
  | "expiracao"
  | "club_ativado"
  | "club_reembolso"
  | "club_renovacao_aviso"
  | "club_expirado";
```

- [ ] **Step 2: Criar `src/lib/club.functions.ts` (parte 1: tipos, helpers, status)**

```ts
/**
 * Server functions do PlanilhaClub. Toda leitura/escrita usa service role
 * depois de validar o usuário (getAuthedUser). A RLS da migration 009 é
 * defesa em profundidade; a regra de tier aplicada aqui é a mesma.
 */
import { createServerFn } from "@tanstack/react-start";
import { getAuthedUser } from "./server-session";
import { isAdminEmail, registrarEvento } from "./push.functions";
import { upsertAssinatura } from "./assinatura.functions";
import { createPixCharge, checkPixStatus, createCreditCardCharge } from "./efi-service";
import {
  CLUB_PLANOS,
  DIAS_PERIODO,
  HORAS_PENDING,
  calcularPeriodo,
  deriveTier,
  podeReembolsar,
  precisaAvisoRenovacao,
  precoPlano,
  podeVer,
  type BillingMethod,
  type ClubPlan,
  type ClubTier,
  type ContentTier,
  type MembershipSource,
  type MembershipStatus,
} from "./club.rules";

const PLANO_ASSINATURA_PREMIUM = "PlanilhaClub Premium";
const ITEM_PLANILHA = "planilha_erick";
const DIA_MS = 24 * 60 * 60 * 1000;

async function getAdminDb() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export type MembershipRow = {
  id: string;
  user_id: string;
  plan: ClubPlan;
  status: MembershipStatus;
  source: MembershipSource;
  billing_method: BillingMethod | null;
  gateway_txid: string | null;
  valor_pago: number | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_renewal: boolean;
  renewal_notice_sent_at: string | null;
  created_at: string;
};

async function listarMemberships(admin: any, userId: string): Promise<MembershipRow[]> {
  const { data } = await admin
    .from("club_memberships")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return (data ?? []) as MembershipRow[];
}

async function temPlanilhaAvulsa(admin: any, userId: string): Promise<boolean> {
  const { data } = await admin
    .from("compras_avulsas")
    .select("id")
    .eq("user_id", userId)
    .eq("item", ITEM_PLANILHA)
    .eq("status", "pago")
    .maybeSingle();
  return !!data;
}

async function temVitalicioAtivo(admin: any, userId: string): Promise<boolean> {
  const { data } = await admin
    .from("assinaturas")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "ativo")
    .eq("plano", "Vitalício")
    .maybeSingle();
  return !!data;
}

export type ClubStatus = {
  tier: ClubTier;
  membership: MembershipRow | null;
  ofertas: { start: number; premium: number; upgradeAvulsa: boolean; vitalicioDisponivel: boolean };
  avisoRenovacao: boolean;
  podeReembolsar: boolean;
  isAdmin: boolean;
};

export const getClubStatus = createServerFn({ method: "GET" }).handler(async (): Promise<ClubStatus> => {
  const me = await getAuthedUser();
  const vazio: ClubStatus = {
    tier: "none",
    membership: null,
    ofertas: { start: CLUB_PLANOS.start.valor, premium: CLUB_PLANOS.premium.valor, upgradeAvulsa: false, vitalicioDisponivel: false },
    avisoRenovacao: false,
    podeReembolsar: false,
    isAdmin: false,
  };
  if (!me) return vazio;

  const admin = await getAdminDb();
  const agora = new Date();
  const [ms, avulsa, vitalicio] = await Promise.all([
    listarMemberships(admin, me.id),
    temPlanilhaAvulsa(admin, me.id),
    temVitalicioAtivo(admin, me.id),
  ]);

  const tier = deriveTier(ms, agora);
  const ativa = ms.find((m) => m.status === "active") ?? null;
  const jaResgatouVitalicio = ms.some((m) => m.source === "vitalicio_included");

  return {
    tier,
    membership: ativa ?? ms[0] ?? null,
    ofertas: {
      start: precoPlano("start", avulsa).valor,
      premium: CLUB_PLANOS.premium.valor,
      upgradeAvulsa: avulsa,
      vitalicioDisponivel: vitalicio && !jaResgatouVitalicio && tier === "none",
    },
    avisoRenovacao: !!ativa && !!ativa.renewal_notice_sent_at && !ativa.cancel_renewal,
    podeReembolsar: !!ativa && podeReembolsar(ativa, agora),
    isAdmin: isAdminEmail(me.email ?? null),
  };
});
```

- [ ] **Step 3: Adicionar ativação idempotente e efeitos colaterais (mesmo arquivo)**

```ts
/**
 * Ativa a membership `id` e aplica os efeitos do plano. Idempotente: se já
 * está `active`, não faz nada. Start → libera a planilha em compras_avulsas.
 * Premium → assinatura ativa no app (gate existente).
 */
async function ativarMembership(admin: any, id: string): Promise<MembershipRow | null> {
  const { data: m } = await admin.from("club_memberships").select("*").eq("id", id).maybeSingle();
  if (!m) return null;
  if (m.status === "active") return m as MembershipRow;

  const agora = new Date();
  const { data: anterior } = await admin
    .from("club_memberships")
    .select("current_period_end")
    .eq("user_id", m.user_id)
    .eq("status", "active")
    .maybeSingle();
  const fimAnterior = anterior?.current_period_end ? new Date(anterior.current_period_end) : null;
  const periodo = calcularPeriodo(agora, fimAnterior);

  // Renovação: a membership antiga vira expired para o índice único liberar.
  if (anterior) {
    await admin
      .from("club_memberships")
      .update({ status: "expired", updated_at: agora.toISOString() })
      .eq("user_id", m.user_id)
      .eq("status", "active");
  }

  const { data: ativa } = await admin
    .from("club_memberships")
    .update({
      status: "active",
      current_period_start: periodo.start.toISOString(),
      current_period_end: periodo.end.toISOString(),
      updated_at: agora.toISOString(),
    })
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (m.plan === "start") {
    const jaTem = await temPlanilhaAvulsa(admin, m.user_id);
    if (!jaTem) {
      await admin.from("compras_avulsas").insert({
        user_id: m.user_id,
        item: ITEM_PLANILHA,
        valor: 0,
        status: "pago",
        txid: `club:${id}`,
      });
    }
  } else {
    await upsertAssinatura(m.user_id, PLANO_ASSINATURA_PREMIUM);
  }

  const { data: prof } = await admin.from("profiles").select("email").eq("id", m.user_id).maybeSingle();
  await registrarEvento({
    tipo: "club_ativado",
    titulo: `${CLUB_PLANOS[m.plan as ClubPlan].nome} ativado`,
    corpo: `${prof?.email ?? "Usuário"} — ${m.source} — R$ ${Number(m.valor_pago ?? 0).toFixed(2)}`,
    refUserId: m.user_id,
    refEmail: prof?.email ?? null,
    refPlano: CLUB_PLANOS[m.plan as ClubPlan].nome,
    refValor: Number(m.valor_pago ?? 0),
    dedupeKey: `club_ativado:${id}`,
  });

  return (ativa ?? null) as MembershipRow | null;
}

/** Premium expirado/cancelado perde o app: assinatura do clube deixa de ser ativa. */
async function revogarPremiumNoApp(admin: any, userId: string) {
  await admin
    .from("assinaturas")
    .update({ status: "expirado", updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("plano", PLANO_ASSINATURA_PREMIUM)
    .eq("status", "ativo");
}
```

- [ ] **Step 4: Adicionar checkout Pix e cartão (mesmo arquivo)**

```ts
type CheckoutInput =
  | { plan: ClubPlan; metodo: "pix" }
  | {
      plan: ClubPlan;
      metodo: "cartao";
      paymentToken: string;
      customerName: string;
      customerCpf: string;
      customerPhone: string;
      installments: number;
    };

type CheckoutResult =
  | { ok: true; metodo: "pix"; txid: string; pixCopiaECola: string; qrcode: string; valor: number }
  | { ok: true; metodo: "cartao"; paid: boolean; message?: string }
  | { ok: false; error: string };

export const criarAssinaturaClube = createServerFn({ method: "POST" })
  .validator((data: CheckoutInput) => data)
  .handler(async ({ data }): Promise<CheckoutResult> => {
    const me = await getAuthedUser();
    if (!me) return { ok: false, error: "Faça login primeiro" };
    if (data.plan !== "start" && data.plan !== "premium") return { ok: false, error: "Plano inválido" };

    const admin = await getAdminDb();
    const ms = await listarMemberships(admin, me.id);
    const tier = deriveTier(ms, new Date());
    const ativa = ms.find((m) => m.status === "active") ?? null;
    // Só permite comprar de novo se está no aviso de renovação (7 dias) ou sem plano.
    if (tier !== "none" && ativa && !ativa.renewal_notice_sent_at) {
      return { ok: false, error: "Você já é membro. A renovação abre 7 dias antes do fim do período." };
    }

    const avulsa = await temPlanilhaAvulsa(admin, me.id);
    const { valor, source } = precoPlano(data.plan, avulsa);
    const descricao = `planilhafuturo ${CLUB_PLANOS[data.plan].nome}`;

    try {
      if (data.metodo === "pix") {
        const pix = await createPixCharge(valor, descricao);
        await admin.from("club_memberships").insert({
          user_id: me.id,
          plan: data.plan,
          status: "pending",
          source,
          billing_method: "a_vista",
          gateway_txid: pix.txid,
          valor_pago: valor,
        });
        return { ok: true, metodo: "pix", txid: pix.txid, pixCopiaECola: pix.pixCopiaECola, qrcode: pix.qrcode, valor };
      }

      const installments = Math.min(12, Math.max(1, Number(data.installments) || 1));
      const card = await createCreditCardCharge(valor, descricao, {
        paymentToken: data.paymentToken,
        customer: {
          name: data.customerName,
          cpf: data.customerCpf,
          email: me.email ?? "",
          phone: data.customerPhone,
        },
        installments,
      });
      if (card.status !== "paid") {
        return { ok: true, metodo: "cartao", paid: false, message: card.message };
      }
      const { data: nova } = await admin
        .from("club_memberships")
        .insert({
          user_id: me.id,
          plan: data.plan,
          status: "pending",
          source,
          billing_method: installments > 1 ? "parcelado_12x" : "a_vista",
          gateway_txid: String(card.charge_id),
          valor_pago: valor,
        })
        .select("id")
        .maybeSingle();
      if (nova?.id) await ativarMembership(admin, nova.id);
      return { ok: true, metodo: "cartao", paid: true };
    } catch (err: any) {
      return { ok: false, error: err.message ?? "Erro ao processar pagamento" };
    }
  });

export const verificarAssinaturaClube = createServerFn({ method: "POST" })
  .validator((data: { txid: string }) => data)
  .handler(async ({ data }): Promise<{ ok: true } | { ok: false; error: string }> => {
    const me = await getAuthedUser();
    if (!me) return { ok: false, error: "Faça login primeiro" };
    const admin = await getAdminDb();
    const { data: m } = await admin
      .from("club_memberships")
      .select("id, status")
      .eq("user_id", me.id)
      .eq("gateway_txid", data.txid)
      .maybeSingle();
    if (!m) return { ok: false, error: "Cobrança não encontrada" };
    if (m.status === "active") return { ok: true };
    try {
      const st = await checkPixStatus(data.txid);
      if (st.status !== "CONCLUIDA") return { ok: false, error: "Pagamento não confirmado ainda." };
      await ativarMembership(admin, m.id);
      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err.message ?? "Erro ao verificar" };
    }
  });
```

- [ ] **Step 5: Adicionar casos especiais, cancelamento e reembolso (mesmo arquivo)**

```ts
export const ativarVitalicioClube = createServerFn({ method: "POST" }).handler(
  async (): Promise<{ ok: true } | { ok: false; error: string }> => {
    const me = await getAuthedUser();
    if (!me) return { ok: false, error: "Faça login primeiro" };
    const admin = await getAdminDb();
    if (!(await temVitalicioAtivo(admin, me.id))) return { ok: false, error: "Só para quem tem o Vitalício." };
    const ms = await listarMemberships(admin, me.id);
    if (ms.some((m) => m.source === "vitalicio_included")) return { ok: false, error: "Você já resgatou seus 12 meses." };
    if (deriveTier(ms, new Date()) !== "none") return { ok: false, error: "Você já é membro." };

    const { data: nova } = await admin
      .from("club_memberships")
      .insert({ user_id: me.id, plan: "premium", status: "pending", source: "vitalicio_included", valor_pago: 0 })
      .select("id")
      .maybeSingle();
    if (!nova?.id) return { ok: false, error: "Não foi possível ativar." };
    await ativarMembership(admin, nova.id);
    return { ok: true };
  },
);

export const cancelarRenovacaoClube = createServerFn({ method: "POST" }).handler(
  async (): Promise<{ ok: true } | { ok: false; error: string }> => {
    const me = await getAuthedUser();
    if (!me) return { ok: false, error: "Faça login primeiro" };
    const admin = await getAdminDb();
    const { data } = await admin
      .from("club_memberships")
      .update({ cancel_renewal: true, updated_at: new Date().toISOString() })
      .eq("user_id", me.id)
      .eq("status", "active")
      .select("id");
    if (!data?.length) return { ok: false, error: "Nenhuma assinatura ativa." };
    return { ok: true };
  },
);

export const solicitarReembolso = createServerFn({ method: "POST" }).handler(
  async (): Promise<{ ok: true } | { ok: false; error: string }> => {
    const me = await getAuthedUser();
    if (!me) return { ok: false, error: "Faça login primeiro" };
    const admin = await getAdminDb();
    const agora = new Date();
    const ms = await listarMemberships(admin, me.id);
    const ativa = ms.find((m) => m.status === "active");
    if (!ativa || !podeReembolsar(ativa, agora)) {
      return { ok: false, error: "Reembolso só nos 7 primeiros dias de uma assinatura paga." };
    }
    await admin
      .from("club_memberships")
      .update({ status: "canceled", cancel_renewal: true, updated_at: agora.toISOString() })
      .eq("id", ativa.id);
    if (ativa.plan === "premium") await revogarPremiumNoApp(admin, me.id);

    await registrarEvento({
      tipo: "club_reembolso",
      titulo: "Reembolso solicitado (7 dias)",
      corpo: `${me.email ?? "Usuário"} — ${CLUB_PLANOS[ativa.plan].nome} — R$ ${Number(ativa.valor_pago ?? 0).toFixed(2)} via ${ativa.billing_method ?? "?"} — txid ${ativa.gateway_txid ?? "?"}. Estornar manualmente na Efí.`,
      refUserId: me.id,
      refEmail: me.email ?? null,
      refPlano: CLUB_PLANOS[ativa.plan].nome,
      refValor: Number(ativa.valor_pago ?? 0),
      dedupeKey: `club_reembolso:${ativa.id}`,
    });
    return { ok: true };
  },
);
```

- [ ] **Step 6: Lint e compile**

```bash
bunx eslint src/lib/club.functions.ts src/lib/assinatura.functions.ts src/lib/push.functions.ts --fix
```

Expected: só erros `no-explicit-any`. Abra `http://localhost:5184/app` (200) para garantir que o import de `club.functions` não quebrou o build do servidor.

- [ ] **Step 7: Commit**

```bash
git add src/lib/club.functions.ts src/lib/assinatura.functions.ts src/lib/push.functions.ts
git commit -m "feat(club): server fns de membership — status, checkout Efi (Pix/cartao), ativacao, vitalicio, cancelamento, reembolso

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 4: `CheckoutForm` + rota `/club/assinar`

**Files:**
- Create: `src/components/CheckoutForm.tsx`
- Create: `src/routes/club.assinar.tsx`

**Interfaces:**
- Consumes: `getClubStatus`, `criarAssinaturaClube`, `verificarAssinaturaClube` (Task 3); `CLUB_PLANOS`, `ClubPlan` (Task 2).
- Produces: `CheckoutForm` com props:

```ts
type CheckoutFormProps = {
  valor: number;                      // preço já resolvido pelo servidor (exibição + consulta de parcelas)
  descricao: string;                  // ex: "PlanilhaClub Start"
  onPix: () => Promise<{ ok: true; txid: string; pixCopiaECola: string; qrcode: string; valor: number } | { ok: false; error: string }>;
  onVerificarPix: (txid: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  onCartao: (p: { paymentToken: string; customerName: string; customerCpf: string; customerPhone: string; installments: number }) => Promise<{ ok: true; paid: boolean; message?: string } | { ok: false; error: string }>;
  onPago: () => void;                 // chamado quando Pix confirmado ou cartão aprovado
};
```

- [ ] **Step 1: Criar `src/components/CheckoutForm.tsx`**

Copiar de `src/routes/checkout.tsx` os blocos: `efiTokenizerEnv` (linhas 55–58), formatters (152–170), `detectBrand` (172–179), o `useEffect` de parcelas (182–212), `luhnCheck` (214–226), `loadEfiPayLib` (229–239), e o JSX das fases `pagamento`, `pix_qr` e `card_result` (524–700). Adaptar para o contrato acima:

```tsx
import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, Copy, Loader2, CreditCard, QrCode, BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type PixData = { txid: string; pixCopiaECola: string; qrcode: string; valor: number };

export type CheckoutFormProps = {
  valor: number;
  descricao: string;
  onPix: () => Promise<({ ok: true } & PixData) | { ok: false; error: string }>;
  onVerificarPix: (txid: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  onCartao: (p: {
    paymentToken: string;
    customerName: string;
    customerCpf: string;
    customerPhone: string;
    installments: number;
  }) => Promise<{ ok: true; paid: boolean; message?: string } | { ok: false; error: string }>;
  onPago: () => void;
};

function efiTokenizerEnv(): "sandbox" | "production" {
  const e =
    (import.meta.env.VITE_EFI_ENV as string | undefined) ??
    (import.meta.env.DEV ? "homologacao" : "producao");
  return e === "producao" || e === "prod" ? "production" : "sandbox";
}

function formatCardNumber(val: string) {
  return val.replace(/\D/g, "").slice(0, 16).replace(/(\d{4})(?=\d)/g, "$1 ");
}
function formatCpf(val: string) {
  return val.replace(/\D/g, "").slice(0, 11).replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}
function formatValidade(val: string) {
  const d = val.replace(/\D/g, "").slice(0, 4);
  return d.length > 2 ? d.slice(0, 2) + "/" + d.slice(2) : d;
}
function formatPhone(val: string) {
  const d = val.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}
function detectBrand(numero: string): string {
  const n = numero.replace(/\D/g, "");
  if (/^4/.test(n)) return "visa";
  if (/^5[1-5]/.test(n) || /^2[2-7]/.test(n)) return "mastercard";
  if (/^3[47]/.test(n)) return "amex";
  if (/^(636368|438935|504175|451416|509048|509067|509049|509069|509074|509073|509072|509071|509070|627780|636297|506699|506698|506697|506696)/.test(n)) return "elo";
  return "";
}
function luhnCheck(card: string): boolean {
  const digits = card.replace(/\D/g, "");
  if (digits.length < 13) return false;
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = parseInt(digits[i], 10);
    if (alt) { n *= 2; if (n > 9) n -= 9; }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}
function loadEfiPayLib(): Promise<any> {
  return new Promise((resolve, reject) => {
    const w = window as any;
    if (w.EfiPay) return resolve(w.EfiPay);
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/gh/efipay/js-payment-token-efi/dist/payment-token-efi-umd.min.js";
    s.onload = () => resolve(w.EfiPay);
    s.onerror = () => reject(new Error("Não foi possível carregar o processador de pagamento."));
    document.head.appendChild(s);
  });
}

const inputCls =
  "w-full h-12 px-4 rounded-xl border border-border bg-card text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors";
const brl = (n: number) => `R$ ${n.toFixed(2).replace(".", ",")}`;

export function CheckoutForm({ valor, descricao, onPix, onVerificarPix, onCartao, onPago }: CheckoutFormProps) {
  const [metodo, setMetodo] = useState<"pix" | "cartao">("pix");
  const [phase, setPhase] = useState<"pagamento" | "pix_qr" | "card_result">("pagamento");
  const [pixData, setPixData] = useState<PixData | null>(null);
  const [copied, setCopied] = useState(false);
  const [cardNome, setCardNome] = useState("");
  const [cardCpf, setCardCpf] = useState("");
  const [cardNumero, setCardNumero] = useState("");
  const [cardValidade, setCardValidade] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [cardPhone, setCardPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");
  const [cardMsg, setCardMsg] = useState("");
  const [parcelasOpts, setParcelasOpts] = useState<{ installment: number; value: number; has_interest: boolean }[]>([]);
  const [parcelas, setParcelas] = useState(1);

  useEffect(() => {
    let cancelled = false;
    const brand = detectBrand(cardNumero);
    if (!brand || cardNumero.replace(/\D/g, "").length < 13) {
      setParcelasOpts([]);
      setParcelas(1);
      return;
    }
    const host = efiTokenizerEnv() === "production"
      ? "https://cobrancas.api.efipay.com.br"
      : "https://cobrancas-h.api.efipay.com.br";
    const payee = import.meta.env.VITE_EFI_PAYEE_CODE as string | undefined;
    if (!payee) return;
    fetch(`${host}/v1/installments/${payee}/jsonp?brand=${brand}&total=${Math.round(valor * 100)}`)
      .then((r) => r.json())
      .then((j) => {
        if (cancelled || !j?.data?.installments) return;
        setParcelasOpts(j.data.installments.map((x: any) => ({ installment: x.installment, value: x.value, has_interest: !!x.has_interest })));
        setParcelas(1);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [cardNumero, valor]);

  async function pagarPix() {
    setError("");
    setLoading(true);
    try {
      const r = await onPix();
      if (r.ok) { setPixData(r); setPhase("pix_qr"); }
      else { setError(r.error); toast.error(r.error); }
    } finally { setLoading(false); }
  }

  async function verificarPix() {
    if (!pixData) return;
    setVerifying(true);
    try {
      const r = await onVerificarPix(pixData.txid);
      if (r.ok) { toast.success("Pagamento confirmado!"); onPago(); }
      else toast.error(r.error);
    } finally { setVerifying(false); }
  }

  async function pagarCartao() {
    if (!cardNome.trim()) return setError("Digite o nome no cartão");
    if (cardCpf.replace(/\D/g, "").length !== 11) return setError("CPF inválido");
    if (!luhnCheck(cardNumero)) return setError("Número do cartão inválido");
    if (cardValidade.replace(/\D/g, "").length !== 4) return setError("Data de validade inválida");
    if (cardCvv.replace(/\D/g, "").length < 3) return setError("CVV inválido");
    if (cardPhone.replace(/\D/g, "").length < 10) return setError("Telefone é obrigatório (DDD + número)");
    setError("");
    setLoading(true);
    const digits = cardValidade.replace(/\D/g, "");
    try {
      const payee = import.meta.env.VITE_EFI_PAYEE_CODE as string | undefined;
      if (!payee) { setError("Pagamento por cartão ainda não configurado. Use Pix."); return; }
      const EfiPay = await loadEfiPayLib();
      const brand = await EfiPay.CreditCard.setCardNumber(cardNumero.replace(/\s/g, "")).verifyCardBrand();
      const tok = await EfiPay.CreditCard
        .setAccount(payee)
        .setEnvironment(efiTokenizerEnv())
        .setCreditCardData({
          brand,
          number: cardNumero.replace(/\s/g, ""),
          cvv: cardCvv,
          expirationMonth: digits.slice(0, 2),
          expirationYear: "20" + digits.slice(2, 4),
          holderName: cardNome,
          holderDocument: cardCpf.replace(/\D/g, ""),
          reuse: false,
        })
        .getPaymentToken();
      const r = await onCartao({
        paymentToken: tok.payment_token,
        customerName: cardNome,
        customerCpf: cardCpf.replace(/\D/g, ""),
        customerPhone: cardPhone.replace(/\D/g, ""),
        installments: parcelas,
      });
      if (!r.ok) { setError(r.error); toast.error(r.error); return; }
      if (r.paid) { toast.success("Pagamento aprovado!"); onPago(); }
      else { setCardMsg(r.message ?? ""); setPhase("card_result"); }
    } catch (e: any) {
      const msg = e?.error_description ?? e?.error ?? e?.message ?? "Erro ao processar pagamento";
      setError(msg);
      toast.error(msg);
    } finally { setLoading(false); }
  }

  function copyPix() {
    if (!pixData) return;
    navigator.clipboard.writeText(pixData.pixCopiaECola);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Código Pix copiado!");
  }

  if (phase === "pix_qr" && pixData) {
    return (
      <div className="text-center space-y-4">
        <div className="h-14 w-14 rounded-2xl bg-primary/10 grid place-items-center mx-auto"><QrCode className="h-7 w-7 text-primary" /></div>
        <div>
          <h2 className="font-display text-xl font-bold">Pague via Pix</h2>
          <p className="text-sm text-muted-foreground mt-1">Escaneie o QR Code ou copie o código</p>
          <p className="text-2xl font-bold tabular-nums mt-2 text-primary">{brl(pixData.valor)}</p>
        </div>
        {pixData.pixCopiaECola && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="mx-auto w-64 h-64 rounded-2xl border border-border bg-white p-3 flex items-center justify-center">
            <QRCodeSVG value={pixData.pixCopiaECola} size={232} level="M" />
          </motion.div>
        )}
        <div className="flex items-center gap-2 bg-muted border border-border rounded-xl p-3 text-xs font-mono">
          <span className="flex-1 truncate">{pixData.pixCopiaECola}</span>
          <button onClick={copyPix} aria-label="Copiar código Pix" className="h-11 w-11 -m-2 grid place-items-center text-primary">{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}</button>
        </div>
        <Button onClick={verificarPix} disabled={verifying} className="w-full h-12 rounded-xl font-semibold">
          {verifying ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <BadgeCheck className="h-4 w-4 mr-2" />}
          {verifying ? "Verificando…" : "Já paguei"}
        </Button>
      </div>
    );
  }

  if (phase === "card_result") {
    return (
      <div className="text-center space-y-4">
        <div className="h-14 w-14 rounded-2xl bg-negative/10 grid place-items-center mx-auto"><CreditCard className="h-7 w-7 text-negative" /></div>
        <h2 className="font-display text-xl font-bold">Pagamento não aprovado</h2>
        {cardMsg && <p className="text-sm text-muted-foreground">{cardMsg}</p>}
        <Button variant="outline" onClick={() => setPhase("pagamento")} className="w-full h-12 rounded-xl">Tentar outro cartão ou Pix</Button>
      </div>
    );
  }

  const opt = parcelasOpts.find((o) => o.installment === parcelas);
  const totalCartao = opt && parcelas > 1 ? (opt.value * parcelas) / 100 : valor;

  return (
    <div className="space-y-4">
      <div className="flex bg-muted rounded-xl p-1">
        {([{ id: "pix" as const, label: "Pix", icon: QrCode }, { id: "cartao" as const, label: "Cartão de Crédito", icon: CreditCard }]).map((m) => (
          <button key={m.id} type="button" onClick={() => { setMetodo(m.id); setError(""); }}
            className={cn("flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg transition-colors", metodo === m.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
            <m.icon className="h-4 w-4" /> {m.label}
          </button>
        ))}
      </div>
      {error && <div className="rounded-xl bg-negative-soft border border-negative/20 px-4 py-3 text-sm text-negative font-medium">{error}</div>}

      {metodo === "pix" && (loading
        ? <div className="space-y-3"><Skeleton className="h-52 w-full rounded-2xl" /><Skeleton className="h-12 w-full rounded-xl" /></div>
        : <Button onClick={pagarPix} className="w-full h-12 rounded-xl font-semibold"><QrCode className="h-4 w-4 mr-2" /> Pagar {brl(valor)} via Pix</Button>)}

      {metodo === "cartao" && (
        <div className="space-y-3">
          <label className="block space-y-1.5"><span className="eyebrow">Nome no cartão</span><input value={cardNome} onChange={(e) => setCardNome(e.target.value)} autoComplete="cc-name" className={inputCls} /></label>
          <label className="block space-y-1.5"><span className="eyebrow">CPF do titular</span><input value={cardCpf} onChange={(e) => setCardCpf(formatCpf(e.target.value))} inputMode="numeric" className={cn(inputCls, "font-mono")} /></label>
          <label className="block space-y-1.5"><span className="eyebrow">Número do cartão</span><input value={cardNumero} onChange={(e) => setCardNumero(formatCardNumber(e.target.value))} inputMode="numeric" autoComplete="cc-number" className={cn(inputCls, "font-mono")} /></label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1.5"><span className="eyebrow">Validade</span><input value={cardValidade} onChange={(e) => setCardValidade(formatValidade(e.target.value))} placeholder="MM/AA" inputMode="numeric" autoComplete="cc-exp" className={cn(inputCls, "font-mono")} /></label>
            <label className="block space-y-1.5"><span className="eyebrow">CVV</span><input value={cardCvv} onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, "").slice(0, 4))} inputMode="numeric" autoComplete="cc-csc" className={cn(inputCls, "font-mono")} /></label>
          </div>
          {parcelasOpts.length > 0 && (
            <label className="block space-y-1.5"><span className="eyebrow">Parcelas</span>
              <select value={parcelas} onChange={(e) => setParcelas(Number(e.target.value))} className={cn(inputCls, "appearance-none")}>
                {parcelasOpts.map((o) => (
                  <option key={o.installment} value={o.installment}>
                    {o.installment}x de {brl(o.value / 100)}{o.installment > 1 ? ` (total ${brl((o.value * o.installment) / 100)})` : ""}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="block space-y-1.5"><span className="eyebrow">Telefone (com DDD)</span><input value={cardPhone} onChange={(e) => setCardPhone(formatPhone(e.target.value))} inputMode="tel" autoComplete="tel" className={cn(inputCls, "font-mono")} /></label>
          <Button onClick={pagarCartao} disabled={loading} className="w-full h-12 rounded-xl font-semibold">
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CreditCard className="h-4 w-4 mr-2" />}
            {loading ? "Processando…" : parcelas > 1 && opt ? `Pagar ${parcelas}x de ${brl(opt.value / 100)} (total ${brl(totalCartao)})` : `Pagar ${brl(totalCartao)} no cartão`}
          </Button>
          <p className="text-[10px] text-center text-muted-foreground/60">{descricao} · processado pela Efí Pagamentos.</p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Criar `src/routes/club.assinar.tsx`**

```tsx
import { createFileRoute, redirect, useNavigate, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { CheckoutForm } from "@/components/CheckoutForm";
import { CLUB_PLANOS, type ClubPlan } from "@/lib/club.rules";
import { getClubStatus, criarAssinaturaClube, verificarAssinaturaClube } from "@/lib/club.functions";
import { Check, Loader2, ArrowLeft } from "lucide-react";

/* Fora do _authenticated de propósito: quem caiu no paywall precisa
   conseguir comprar o Premium. Só sessão; preço vem do servidor. */
export const Route = createFileRoute("/club/assinar")({
  ssr: false,
  validateSearch: (s: Record<string, string | undefined>) => ({
    plan: (s.plan === "premium" ? "premium" : "start") as ClubPlan,
  }),
  head: () => ({ meta: [{ title: "Assinar o PlanilhaClub — planilhafuturo" }] }),
  beforeLoad: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw redirect({ to: "/auth" });
  },
  component: AssinarPage,
});

const BENEFICIOS: Record<ClubPlan, string[]> = {
  start: ["Acesso ao clube (canal fechado, calls e desafios)", "Planilha em Excel, sua pra sempre"],
  premium: ["Acesso ao clube (canal fechado, calls e desafios)", "Sistema hospedado liberado por 12 meses"],
};

function AssinarPage() {
  const { plan } = Route.useSearch();
  const nav = useNavigate();
  const status = useQuery({ queryKey: ["club-status"], queryFn: () => getClubStatus() });

  if (status.isPending) {
    return <div className="min-h-screen grid place-items-center bg-background"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }
  const s = status.data!;
  const valor = plan === "start" ? s.ofertas.start : s.ofertas.premium;
  const info = CLUB_PLANOS[plan];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
          <Link to="/club" aria-label="Voltar" className="h-11 w-11 -ml-2 grid place-items-center rounded-lg text-muted-foreground hover:bg-muted"><ArrowLeft className="h-4 w-4" /></Link>
          <Logo size={17} />
        </div>
      </header>
      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
        <div className="rounded-2xl border border-border bg-card p-5">
          <span className="eyebrow">Você está assinando</span>
          <h1 className="font-display text-2xl font-bold mt-1">{info.nome}</h1>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold tabular-nums">R$ {valor.toFixed(2).replace(".", ",")}</span>
            <span className="text-xs text-muted-foreground">/ano · {info.detalhe}</span>
          </div>
          {plan === "start" && s.ofertas.upgradeAvulsa && (
            <p className="mt-2 text-xs text-positive font-medium">Você já tem a planilha: paga só o clube (R$ 70 descontados).</p>
          )}
          <ul className="mt-3 space-y-1.5">
            {BENEFICIOS[plan].map((b) => (
              <li key={b} className="flex items-center gap-1.5 text-sm text-muted-foreground"><Check className="h-3.5 w-3.5 text-positive shrink-0" /> {b}</li>
            ))}
          </ul>
          <p className="mt-3 text-[11px] text-muted-foreground/70">Compromisso anual. Reembolso integral em até 7 dias. Cancelar a renovação não gera reembolso proporcional; o acesso segue até o fim do período pago.</p>
        </div>

        <CheckoutForm
          valor={valor}
          descricao={info.nome}
          onPix={async () => {
            const r = await criarAssinaturaClube({ data: { plan, metodo: "pix" } });
            if (!r.ok) return r;
            if (r.metodo !== "pix") return { ok: false as const, error: "Resposta inesperada" };
            return { ok: true as const, txid: r.txid, pixCopiaECola: r.pixCopiaECola, qrcode: r.qrcode, valor: r.valor };
          }}
          onVerificarPix={(txid) => verificarAssinaturaClube({ data: { txid } })}
          onCartao={async (p) => {
            const r = await criarAssinaturaClube({ data: { plan, metodo: "cartao", ...p } });
            if (!r.ok) return r;
            if (r.metodo !== "cartao") return { ok: false as const, error: "Resposta inesperada" };
            return { ok: true as const, paid: r.paid, message: r.message };
          }}
          onPago={() => nav({ to: "/club" })}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Lint e compile**

```bash
bunx eslint src/components/CheckoutForm.tsx src/routes/club.assinar.tsx --fix
curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:5184/club/assinar?plan=start"
```

Expected: `200` (rota `ssr:false` serve o shell; a rota `/club` ainda não existe, o `Link` compila porque o TanStack só valida rotas registradas — se o type-check reclamar de `/club`, crie a Task 6 antes de commitar ou troque temporariamente por `/app`).

- [ ] **Step 4: Teste manual em sandbox Efí**

Logado com um usuário de teste, abra `/club/assinar?plan=start`: gere o Pix, pague no sandbox, clique "Já paguei" → redireciona para `/club` (404 até a Task 6 — ok). No SQL editor: `select plan, status, source, current_period_end from club_memberships order by created_at desc limit 1;` → `start | active | new`. `select status from compras_avulsas where item='planilha_erick' and user_id='<id>'` → `pago`.

- [ ] **Step 5: Commit**

```bash
git add src/components/CheckoutForm.tsx src/routes/club.assinar.tsx src/routeTree.gen.ts
git commit -m "feat(club): CheckoutForm reutilizavel + /club/assinar (Pix e cartao 12x, fora do paywall)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 5: Renovação assistida no cron

**Files:**
- Modify: `src/lib/club.functions.ts` (adicionar `verificarRenovacoesClube`)
- Modify: `src/lib/push.functions.ts:319-334` (`rodarCronExpiracao`)

**Interfaces:**
- Consumes: `precisaAvisoRenovacao`, `HORAS_PENDING` (Task 2); `registrarEvento`; `revogarPremiumNoApp` (Task 3, mesmo arquivo).
- Produces: `verificarRenovacoesClube(): Promise<{ avisados: number; expirados: number; pendentesLimpos: number }>`; `CronExpiracaoResult` ganha `club?: { avisados; expirados; pendentesLimpos }`.

- [ ] **Step 1: Adicionar ao fim de `club.functions.ts`**

```ts
/**
 * Passo diário do clube (chamado por rodarCronExpiracao via import dinâmico
 * para não criar ciclo push.functions ↔ club.functions):
 * 1) aviso prévio 7 dias antes do fim; 2) expira períodos vencidos
 *    (Premium perde o app); 3) limpa Pix pendente com mais de 24h.
 */
export async function verificarRenovacoesClube(): Promise<{ avisados: number; expirados: number; pendentesLimpos: number }> {
  const admin = await getAdminDb();
  const agora = new Date();
  const agoraIso = agora.toISOString();
  const { data: ativas } = await admin.from("club_memberships").select("*").eq("status", "active");
  let avisados = 0;
  let expirados = 0;

  for (const m of (ativas ?? []) as MembershipRow[]) {
    const { data: prof } = await admin.from("profiles").select("email").eq("id", m.user_id).maybeSingle();
    const email = prof?.email ?? "Usuário";

    if (m.current_period_end && new Date(m.current_period_end) <= agora) {
      await admin.from("club_memberships").update({ status: "expired", updated_at: agoraIso }).eq("id", m.id);
      if (m.plan === "premium") await revogarPremiumNoApp(admin, m.user_id);
      await registrarEvento({
        tipo: "club_expirado",
        titulo: "Clube expirou",
        corpo: `${email} — ${CLUB_PLANOS[m.plan].nome} venceu sem renovar.`,
        refUserId: m.user_id,
        refEmail: email,
        dedupeKey: `club_expirado:${m.id}`,
      });
      expirados++;
      continue;
    }

    if (precisaAvisoRenovacao(m, agora)) {
      await admin.from("club_memberships").update({ renewal_notice_sent_at: agoraIso, updated_at: agoraIso }).eq("id", m.id);
      await registrarEvento({
        tipo: "club_renovacao_aviso",
        titulo: "Renovação do clube em 7 dias",
        corpo: `${email} — ${CLUB_PLANOS[m.plan].nome} vence em ${new Date(m.current_period_end!).toLocaleDateString("pt-BR")}.`,
        refUserId: m.user_id,
        refEmail: email,
        dedupeKey: `club_renovacao_aviso:${m.id}`,
      });
      avisados++;
    }
  }

  const limite = new Date(agora.getTime() - HORAS_PENDING * 60 * 60 * 1000).toISOString();
  const { data: limpos } = await admin
    .from("club_memberships")
    .update({ status: "expired", updated_at: agoraIso })
    .eq("status", "pending")
    .lt("created_at", limite)
    .select("id");

  return { avisados, expirados, pendentesLimpos: limpos?.length ?? 0 };
}
```

- [ ] **Step 2: Chamar no cron (`push.functions.ts`)**

Substituir o tipo e o handler de `rodarCronExpiracao`:

```ts
export type CronExpiracaoResult =
  | { ok: true; expirados: number; avisados: number; club?: { avisados: number; expirados: number; pendentesLimpos: number }; clubError?: string }
  | { ok: false; error: string };

export const rodarCronExpiracao = createServerFn({ method: "GET" })
  .handler(async (): Promise<CronExpiracaoResult> => {
    const request = getRequest();
    const cronSchedule = request.headers.get("x-vercel-cron-schedule") ?? "";
    const url = new URL(request.url);
    const token = url.searchParams.get("token") ?? "";
    const expectedToken = process.env.CRON_TOKEN ?? "";

    const authorized = cronSchedule.length > 0 || (expectedToken.length > 0 && token === expectedToken);
    if (!authorized) {
      return { ok: false, error: "Não autorizado" };
    }

    const r = await verificarExpirados();

    // Clube: isolado — uma falha aqui não derruba a expiração acima, nem vice-versa.
    let club: CronExpiracaoResult extends { ok: true; club?: infer C } ? C : never;
    let clubError: string | undefined;
    try {
      const m = await import("./club.functions");
      club = await m.verificarRenovacoesClube();
    } catch (e: any) {
      clubError = e?.message ?? String(e);
    }

    return { ok: true, expirados: r.expirados, avisados: r.avisados, club, clubError };
  });
```

- [ ] **Step 3: Lint, compile, teste manual**

```bash
bunx eslint src/lib/club.functions.ts src/lib/push.functions.ts --fix
curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:5184/api/cron?token=$CRON_TOKEN"
```

Expected: `200` com `CRON_TOKEN` do `.env` (sem token, `500`/`401` como hoje). Para testar o aviso: no SQL editor, `update club_memberships set current_period_end = now() + interval '3 days' where id='<id>'`, rode o cron, confira `renewal_notice_sent_at` preenchido e uma linha em `notificacoes` tipo `club_renovacao_aviso`. Para expiração: `current_period_end = now() - interval '1 day'`, rode, confira `status = expired` e, se Premium, `assinaturas.status = expirado`.

- [ ] **Step 4: Commit**

```bash
git add src/lib/club.functions.ts src/lib/push.functions.ts
git commit -m "feat(club): renovacao assistida no cron — aviso 7 dias, expiracao, limpeza de Pix pendente

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 6: Feed e eventos — server fns

**Files:**
- Modify: `src/lib/club.functions.ts` (adicionar ao fim)

**Interfaces:**
- Produces:
  - `type PostRow = { id: string; authorId: string; authorNome: string; channel: "public" | "closed"; content: string; pinned: boolean; createdAt: string; mine: boolean }`
  - `listarPosts({ data: { channel } })` → `{ tier: ClubTier; posts: PostRow[] }`
  - `criarPost({ data: { channel, content } })`, `excluirPost({ data: { id } })`, `fixarPost({ data: { id, pinned } })` → `{ ok: true } | { ok: false; error }`
  - `type EventoRow = { id: string; title: string; type: "call" | "desafio"; description: string | null; scheduledAt: string; tierRequired: ContentTier; rsvps: number; going: boolean }`
  - `listarEventos()` → `{ tier: ClubTier; eventos: EventoRow[] }` (só eventos com `podeVer(tier, tierRequired)`)
  - `criarEvento({ data: { title, type, description, scheduledAt, tierRequired: ContentTier } })`, `rsvpEvento({ data: { eventId } })` → `{ ok: true } | { ok: false; error }`
  - `type AulaRow = { id: string; title: string; description: string | null; videoUrl: string | null; tierRequired: ContentTier; modulo: string | null; ordem: number; published: boolean; liberada: boolean }` — `liberada = podeVer(tier, tierRequired)`; quando `false`, `videoUrl` e `description` vêm `null` (o servidor não entrega o conteúdo travado)
  - `listarAulas()` → `{ tier: ClubTier; aulas: AulaRow[] }` (admin recebe também as não publicadas)
  - `criarAula({ data: { title, description?, videoUrl?, tierRequired, modulo?, ordem?, published? } })`, `editarAula({ data: { id, ...mesmos campos } })`, `excluirAula({ data: { id } })` → `{ ok: true } | { ok: false; error }` (admin)

- [ ] **Step 1: Adicionar ao fim de `club.functions.ts`**

```ts
// ─── Feed ────────────────────────────────────────────────────

async function tierDoUsuario(admin: any, userId: string): Promise<ClubTier> {
  return deriveTier(await listarMemberships(admin, userId), new Date());
}

async function ehAdmin(): Promise<boolean> {
  const me = await getAuthedUser();
  return !!me && isAdminEmail(me.email ?? null);
}

export type PostRow = {
  id: string;
  authorId: string;
  authorNome: string;
  channel: "public" | "closed";
  content: string;
  pinned: boolean;
  createdAt: string;
  mine: boolean;
};

export const listarPosts = createServerFn({ method: "GET" })
  .validator((data: { channel: "public" | "closed" }) => data)
  .handler(async ({ data }): Promise<{ tier: ClubTier; posts: PostRow[] }> => {
    const me = await getAuthedUser();
    if (!me) return { tier: "none", posts: [] };
    const admin = await getAdminDb();
    const tier = await tierDoUsuario(admin, me.id);
    if (data.channel === "closed" && tier === "none") return { tier, posts: [] };

    const { data: rows } = await admin
      .from("club_posts")
      .select("id, author_id, channel, content, pinned, created_at")
      .eq("channel", data.channel)
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(50);
    const ids = [...new Set((rows ?? []).map((r: any) => r.author_id))];
    const { data: profs } = ids.length
      ? await admin.from("profiles").select("id, nome").in("id", ids)
      : { data: [] as { id: string; nome: string | null }[] };
    const nome = new Map((profs ?? []).map((p: any) => [p.id, (p.nome ?? "Membro").split(" ")[0]]));

    return {
      tier,
      posts: (rows ?? []).map((r: any) => ({
        id: r.id,
        authorId: r.author_id,
        authorNome: nome.get(r.author_id) ?? "Membro",
        channel: r.channel,
        content: r.content,
        pinned: r.pinned,
        createdAt: r.created_at,
        mine: r.author_id === me.id,
      })),
    };
  });

type Ok = { ok: true } | { ok: false; error: string };

export const criarPost = createServerFn({ method: "POST" })
  .validator((data: { channel: "public" | "closed"; content: string }) => data)
  .handler(async ({ data }): Promise<Ok> => {
    const me = await getAuthedUser();
    if (!me) return { ok: false, error: "Faça login primeiro" };
    const content = data.content.trim();
    if (content.length < 1 || content.length > 2000) return { ok: false, error: "Texto entre 1 e 2000 caracteres." };
    const admin = await getAdminDb();
    if ((await tierDoUsuario(admin, me.id)) === "none") return { ok: false, error: "Só membros publicam." };
    const { error } = await admin.from("club_posts").insert({ author_id: me.id, channel: data.channel, content });
    return error ? { ok: false, error: error.message } : { ok: true };
  });

export const excluirPost = createServerFn({ method: "POST" })
  .validator((data: { id: string }) => data)
  .handler(async ({ data }): Promise<Ok> => {
    const me = await getAuthedUser();
    if (!me) return { ok: false, error: "Faça login primeiro" };
    const admin = await getAdminDb();
    const q = admin.from("club_posts").delete().eq("id", data.id);
    const { error } = (await ehAdmin()) ? await q : await q.eq("author_id", me.id);
    return error ? { ok: false, error: error.message } : { ok: true };
  });

export const fixarPost = createServerFn({ method: "POST" })
  .validator((data: { id: string; pinned: boolean }) => data)
  .handler(async ({ data }): Promise<Ok> => {
    if (!(await ehAdmin())) return { ok: false, error: "Só o admin fixa posts." };
    const admin = await getAdminDb();
    const { error } = await admin.from("club_posts").update({ pinned: data.pinned }).eq("id", data.id);
    return error ? { ok: false, error: error.message } : { ok: true };
  });

// ─── Eventos ─────────────────────────────────────────────────

export type EventoRow = {
  id: string;
  title: string;
  type: "call" | "desafio";
  description: string | null;
  scheduledAt: string;
  tierRequired: ContentTier;
  rsvps: number;
  going: boolean;
};

export const listarEventos = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ tier: ClubTier; eventos: EventoRow[] }> => {
    const me = await getAuthedUser();
    if (!me) return { tier: "none", eventos: [] };
    const admin = await getAdminDb();
    const tier = await tierDoUsuario(admin, me.id);
    const { data: todos } = await admin.from("club_events").select("*").order("scheduled_at", { ascending: true });
    const evs = (todos ?? []).filter((e: any) => podeVer(tier, e.tier_required as ContentTier));
    const ids = (evs ?? []).map((e: any) => e.id);
    const { data: rs } = ids.length
      ? await admin.from("club_event_rsvps").select("event_id, user_id").in("event_id", ids)
      : { data: [] as { event_id: string; user_id: string }[] };
    const porEvento = new Map<string, { n: number; going: boolean }>();
    for (const r of rs ?? []) {
      const cur = porEvento.get(r.event_id) ?? { n: 0, going: false };
      cur.n++;
      if (r.user_id === me.id) cur.going = true;
      porEvento.set(r.event_id, cur);
    }
    return {
      tier,
      eventos: (evs ?? []).map((e: any) => ({
        id: e.id,
        title: e.title,
        type: e.type,
        description: e.description,
        scheduledAt: e.scheduled_at,
        tierRequired: e.tier_required,
        rsvps: porEvento.get(e.id)?.n ?? 0,
        going: porEvento.get(e.id)?.going ?? false,
      })),
    };
  },
);

export const criarEvento = createServerFn({ method: "POST" })
  .validator((data: { title: string; type: "call" | "desafio"; description?: string; scheduledAt: string; tierRequired: ContentTier }) => data)
  .handler(async ({ data }): Promise<Ok> => {
    const me = await getAuthedUser();
    if (!me || !isAdminEmail(me.email ?? null)) return { ok: false, error: "Só o admin cria eventos." };
    if (!data.title.trim()) return { ok: false, error: "Título obrigatório." };
    if (isNaN(new Date(data.scheduledAt).getTime())) return { ok: false, error: "Data inválida." };
    const admin = await getAdminDb();
    const { error } = await admin.from("club_events").insert({
      title: data.title.trim(),
      type: data.type,
      description: data.description?.trim() || null,
      scheduled_at: new Date(data.scheduledAt).toISOString(),
      tier_required: data.tierRequired,
      created_by: me.id,
    });
    return error ? { ok: false, error: error.message } : { ok: true };
  });

export const rsvpEvento = createServerFn({ method: "POST" })
  .validator((data: { eventId: string }) => data)
  .handler(async ({ data }): Promise<Ok> => {
    const me = await getAuthedUser();
    if (!me) return { ok: false, error: "Faça login primeiro" };
    const admin = await getAdminDb();
    if ((await tierDoUsuario(admin, me.id)) === "none") return { ok: false, error: "Só membros confirmam presença." };
    const { data: existente } = await admin
      .from("club_event_rsvps")
      .select("event_id")
      .eq("event_id", data.eventId)
      .eq("user_id", me.id)
      .maybeSingle();
    const { error } = existente
      ? await admin.from("club_event_rsvps").delete().eq("event_id", data.eventId).eq("user_id", me.id)
      : await admin.from("club_event_rsvps").insert({ event_id: data.eventId, user_id: me.id });
    return error ? { ok: false, error: error.message } : { ok: true };
  });

// ─── Aulas ───────────────────────────────────────────────────

export type AulaRow = {
  id: string;
  title: string;
  description: string | null;
  videoUrl: string | null;
  tierRequired: ContentTier;
  modulo: string | null;
  ordem: number;
  published: boolean;
  liberada: boolean;
};

type AulaInput = {
  title: string;
  description?: string;
  videoUrl?: string;
  tierRequired: ContentTier;
  modulo?: string;
  ordem?: number;
  published?: boolean;
};

const TIERS: ContentTier[] = ["free", "start", "premium"];

function validarAula(d: AulaInput): string | null {
  if (!d.title?.trim()) return "Título obrigatório.";
  if (!TIERS.includes(d.tierRequired)) return "Nível inválido.";
  if (d.videoUrl && !/^https?:\/\//.test(d.videoUrl.trim())) return "URL do vídeo inválida.";
  return null;
}

function aulaPayload(d: AulaInput, userId?: string) {
  return {
    title: d.title.trim(),
    description: d.description?.trim() || null,
    video_url: d.videoUrl?.trim() || null,
    tier_required: d.tierRequired,
    modulo: d.modulo?.trim() || null,
    ordem: Number.isFinite(d.ordem) ? Number(d.ordem) : 0,
    published: d.published ?? true,
    ...(userId ? { created_by: userId } : {}),
    updated_at: new Date().toISOString(),
  };
}

export const listarAulas = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ tier: ClubTier; aulas: AulaRow[] }> => {
    const me = await getAuthedUser();
    if (!me) return { tier: "none", aulas: [] };
    const admin = await getAdminDb();
    const tier = await tierDoUsuario(admin, me.id);
    const adminLogado = isAdminEmail(me.email ?? null);
    let q = admin.from("club_lessons").select("*").order("modulo", { ascending: true }).order("ordem", { ascending: true });
    if (!adminLogado) q = q.eq("published", true);
    const { data: rows } = await q;
    return {
      tier,
      aulas: (rows ?? []).map((r: any) => {
        const liberada = adminLogado || podeVer(tier, r.tier_required as ContentTier);
        return {
          id: r.id,
          title: r.title,
          description: liberada ? r.description : null,
          videoUrl: liberada ? r.video_url : null,
          tierRequired: r.tier_required,
          modulo: r.modulo,
          ordem: r.ordem,
          published: r.published,
          liberada,
        };
      }),
    };
  },
);

export const criarAula = createServerFn({ method: "POST" })
  .validator((data: AulaInput) => data)
  .handler(async ({ data }): Promise<Ok> => {
    const me = await getAuthedUser();
    if (!me || !isAdminEmail(me.email ?? null)) return { ok: false, error: "Só o admin cria aulas." };
    const erro = validarAula(data);
    if (erro) return { ok: false, error: erro };
    const admin = await getAdminDb();
    const { error } = await admin.from("club_lessons").insert(aulaPayload(data, me.id));
    return error ? { ok: false, error: error.message } : { ok: true };
  });

export const editarAula = createServerFn({ method: "POST" })
  .validator((data: AulaInput & { id: string }) => data)
  .handler(async ({ data }): Promise<Ok> => {
    const me = await getAuthedUser();
    if (!me || !isAdminEmail(me.email ?? null)) return { ok: false, error: "Só o admin edita aulas." };
    const erro = validarAula(data);
    if (erro) return { ok: false, error: erro };
    const admin = await getAdminDb();
    const { error } = await admin.from("club_lessons").update(aulaPayload(data)).eq("id", data.id);
    return error ? { ok: false, error: error.message } : { ok: true };
  });

export const excluirAula = createServerFn({ method: "POST" })
  .validator((data: { id: string }) => data)
  .handler(async ({ data }): Promise<Ok> => {
    const me = await getAuthedUser();
    if (!me || !isAdminEmail(me.email ?? null)) return { ok: false, error: "Só o admin exclui aulas." };
    const admin = await getAdminDb();
    const { error } = await admin.from("club_lessons").delete().eq("id", data.id);
    return error ? { ok: false, error: error.message } : { ok: true };
  });
```

- [ ] **Step 2: Lint e commit**

```bash
bunx eslint src/lib/club.functions.ts --fix
git add src/lib/club.functions.ts
git commit -m "feat(club): server fns do feed (posts, fixar, excluir), eventos (listar, criar, rsvp) e aulas (listar, criar, editar, excluir)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 7: Página `/club`, navegação, PRO Anual → Premium

**Files:**
- Create: `src/routes/_authenticated/club.tsx`
- Modify: `src/components/AppShellV2.tsx:42-65` (NAV, BOTTOM_NAV)
- Modify: `src/routes/_authenticated/config.tsx:411-422` e `:571`
- Modify: `src/components/Paywall.tsx:78-84`

**Interfaces:**
- Consumes: tudo de Tasks 3 e 6; `CLUB_PLANOS` (Task 2); `KpiCardV2` não é usado aqui; `Tabs` de `@/components/ui/tabs`; `Dialog` de `@/components/ui/dialog`.

- [ ] **Step 1: Criar `src/routes/_authenticated/club.tsx`**

```tsx
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { cn } from "@/lib/utils";
import { CLUB_PLANOS, videoEmbedUrl, type ContentTier } from "@/lib/club.rules";
import {
  getClubStatus, ativarVitalicioClube, cancelarRenovacaoClube, solicitarReembolso,
  listarPosts, criarPost, excluirPost, fixarPost,
  listarEventos, criarEvento, rsvpEvento,
  listarAulas, criarAula, editarAula, excluirAula,
  type PostRow, type EventoRow, type AulaRow,
} from "@/lib/club.functions";
import { Lock, Pin, PinOff, Trash2, Users, CalendarDays, Plus, Sparkles, Crown, PlayCircle, Pencil } from "lucide-react";

const NIVEL_LABEL: Record<ContentTier, string> = { free: "Grátis", start: "Start", premium: "Premium" };

export const Route = createFileRoute("/_authenticated/club")({
  head: () => ({ meta: [{ title: "PlanilhaClub — planilhafuturo" }] }),
  component: ClubPage,
});

const TIER_LABEL = { none: "Grátis", start: "Start", premium: "Premium" } as const;

function tempoRelativo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h`;
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function ClubPage() {
  const qc = useQueryClient();
  const status = useQuery({ queryKey: ["club-status"], queryFn: () => getClubStatus() });
  const s = status.data;
  const tier = s?.tier ?? "none";
  const isMember = tier !== "none";
  const invalidateStatus = () => qc.invalidateQueries({ queryKey: ["club-status"] });

  const ativarVitalicio = useMutation({
    mutationFn: () => ativarVitalicioClube(),
    onSuccess: (r) => { if (r.ok) { toast.success("12 meses de clube ativados!"); invalidateStatus(); } else toast.error(r.error); },
  });
  const cancelar = useMutation({
    mutationFn: () => cancelarRenovacaoClube(),
    onSuccess: (r) => { if (r.ok) { toast.success("Renovação cancelada. Seu acesso segue até o fim do período."); invalidateStatus(); } else toast.error(r.error); },
  });
  const reembolso = useMutation({
    mutationFn: () => solicitarReembolso(),
    onSuccess: (r) => { if (r.ok) { toast.success("Reembolso solicitado. Você receberá o estorno em breve."); invalidateStatus(); } else toast.error(r.error); },
  });
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [confirmReembolso, setConfirmReembolso] = useState(false);

  const fim = s?.membership?.current_period_end
    ? new Date(s.membership.current_period_end).toLocaleDateString("pt-BR")
    : null;

  return (
    <div className="page-container space-y-4 animate-in">
      <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="eyebrow">PlanilhaClub</span>
            <h1 className="font-display text-2xl font-bold mt-0.5 flex items-center gap-2">
              Comunidade
              <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold", isMember ? "bg-positive-soft text-positive" : "bg-muted text-muted-foreground")}>
                {isMember && <Crown className="h-3 w-3" />} {TIER_LABEL[tier]}
              </span>
            </h1>
            {isMember && fim && <p className="text-xs text-muted-foreground mt-1">Acesso até {fim}{s?.membership?.cancel_renewal ? " · renovação cancelada" : ""}</p>}
          </div>
          {s?.isAdmin && <span className="text-[10px] font-bold text-primary bg-primary/10 rounded-full px-2 py-1">ADMIN</span>}
        </div>

        {s?.avisoRenovacao && (
          <div className="rounded-xl bg-warning-soft border border-warning/30 px-4 py-3 text-sm">
            Seu clube vence em {fim}. Renove para não perder o acesso.
            <Link to="/club/assinar" search={{ plan: s.membership?.plan ?? "start" }} className="ml-2 font-semibold text-warning underline">Renovar</Link>
          </div>
        )}

        {!isMember && (
          <div className="grid gap-2 sm:grid-cols-2">
            {(["start", "premium"] as const).map((p) => (
              <Link key={p} to="/club/assinar" search={{ plan: p }} className="rounded-xl border border-border p-4 hover:border-primary/40 transition-colors">
                <div className="font-semibold">{CLUB_PLANOS[p].nome}</div>
                <div className="text-2xl font-bold tabular-nums mt-1">R$ {(p === "start" ? s?.ofertas.start ?? CLUB_PLANOS.start.valor : s?.ofertas.premium ?? CLUB_PLANOS.premium.valor).toFixed(2).replace(".", ",")}<span className="text-xs text-muted-foreground font-normal"> /ano</span></div>
                <div className="text-xs text-muted-foreground mt-1">{p === "start" ? "Clube + planilha em Excel" : "Clube + sistema hospedado"}</div>
              </Link>
            ))}
            {s?.ofertas.vitalicioDisponivel && (
              <Button onClick={() => ativarVitalicio.mutate()} disabled={ativarVitalicio.isPending} className="sm:col-span-2 h-12 rounded-xl">
                <Sparkles className="h-4 w-4 mr-2" /> Ativar meus 12 meses de clube (Vitalício)
              </Button>
            )}
          </div>
        )}

        {isMember && (
          <div className="flex flex-wrap gap-2 text-xs">
            {s?.podeReembolsar && <button onClick={() => setConfirmReembolso(true)} className="text-negative underline">Pedir reembolso (7 dias)</button>}
            {!s?.membership?.cancel_renewal && s?.membership?.source !== "vitalicio_included" && (
              <button onClick={() => setConfirmCancel(true)} className="text-muted-foreground underline">Cancelar renovação</button>
            )}
          </div>
        )}
      </div>

      <Tabs defaultValue="aulas">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="aulas"><PlayCircle className="h-4 w-4 mr-1.5" /> Aulas</TabsTrigger>
          <TabsTrigger value="feed"><Users className="h-4 w-4 mr-1.5" /> Feed</TabsTrigger>
          <TabsTrigger value="eventos"><CalendarDays className="h-4 w-4 mr-1.5" /> Eventos</TabsTrigger>
        </TabsList>
        <TabsContent value="aulas"><Aulas isAdmin={!!s?.isAdmin} /></TabsContent>
        <TabsContent value="feed"><Feed isMember={isMember} isAdmin={!!s?.isAdmin} /></TabsContent>
        <TabsContent value="eventos"><Eventos isMember={isMember} isAdmin={!!s?.isAdmin} /></TabsContent>
      </Tabs>

      <ConfirmDialog open={confirmCancel} onOpenChange={setConfirmCancel} onConfirm={() => cancelar.mutate()}
        title="Cancelar a renovação?" description="Sem reembolso proporcional. Seu acesso continua até o fim do período já pago." confirmLabel="Cancelar renovação" variant="destructive" />
      <ConfirmDialog open={confirmReembolso} onOpenChange={setConfirmReembolso} onConfirm={() => reembolso.mutate()}
        title="Pedir reembolso integral?" description="Você perde o acesso ao clube agora. O estorno é feito na forma de pagamento original." confirmLabel="Pedir reembolso" variant="destructive" />
    </div>
  );
}

function Feed({ isMember, isAdmin }: { isMember: boolean; isAdmin: boolean }) {
  const qc = useQueryClient();
  const [channel, setChannel] = useState<"public" | "closed">("public");
  const [texto, setTexto] = useState("");
  const [delId, setDelId] = useState<string | null>(null);
  const posts = useQuery({
    queryKey: ["club-posts", channel],
    queryFn: () => listarPosts({ data: { channel } }),
    refetchInterval: 30_000,
  });
  const invalidate = () => qc.invalidateQueries({ queryKey: ["club-posts"] });
  const publicar = useMutation({
    mutationFn: () => criarPost({ data: { channel, content: texto } }),
    onSuccess: (r) => { if (r.ok) { setTexto(""); invalidate(); } else toast.error(r.error); },
  });
  const excluir = useMutation({ mutationFn: (id: string) => excluirPost({ data: { id } }), onSuccess: invalidate });
  const fixar = useMutation({ mutationFn: (p: { id: string; pinned: boolean }) => fixarPost({ data: p }), onSuccess: invalidate });

  return (
    <div className="space-y-3 mt-3">
      <div className="flex gap-1 rounded-xl border border-border bg-card p-1 w-fit">
        {(["public", "closed"] as const).map((c) => (
          <button key={c} onClick={() => setChannel(c)}
            className={cn("h-9 px-3 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5", channel === c ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
            {c === "closed" && !isMember && <Lock className="h-3.5 w-3.5" />} {c === "public" ? "Público" : "Fechado"}
          </button>
        ))}
      </div>

      {channel === "closed" && !isMember ? (
        <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Canal fechado é só pra membros. <Link to="/club/assinar" search={{ plan: "start" }} className="text-primary font-semibold underline">Assinar o clube</Link>
        </div>
      ) : (
        <>
          {isMember ? (
            <div className="rounded-2xl border border-border bg-card p-3 space-y-2">
              <textarea value={texto} onChange={(e) => setTexto(e.target.value.slice(0, 2000))} rows={3} placeholder={channel === "public" ? "Compartilhe com todo mundo…" : "Só membros veem isso…"}
                className="w-full resize-none bg-transparent outline-none text-sm p-1" />
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground tabular-nums">{texto.length}/2000</span>
                <Button size="sm" onClick={() => publicar.mutate()} disabled={!texto.trim() || publicar.isPending}>Publicar</Button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground px-1">Você está só lendo. <Link to="/club/assinar" search={{ plan: "start" }} className="text-primary font-semibold underline">Vire membro</Link> pra participar.</p>
          )}

          {posts.isPending && <div className="skeleton h-24 rounded-2xl" />}
          {posts.data?.posts.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">Nenhum post ainda.</p>}
          {posts.data?.posts.map((p: PostRow) => (
            <article key={p.id} className={cn("rounded-2xl border bg-card p-4", p.pinned ? "border-primary/40" : "border-border")}>
              <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <span><strong className="text-foreground">{p.authorNome}</strong> · {tempoRelativo(p.createdAt)}{p.pinned && " · fixado"}</span>
                <span className="flex items-center gap-1">
                  {isAdmin && (
                    <button onClick={() => fixar.mutate({ id: p.id, pinned: !p.pinned })} aria-label={p.pinned ? "Desafixar" : "Fixar"} className="h-11 w-11 -m-2 grid place-items-center hover:text-primary">
                      {p.pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                    </button>
                  )}
                  {(isAdmin || p.mine) && (
                    <button onClick={() => setDelId(p.id)} aria-label="Excluir post" className="h-11 w-11 -m-2 grid place-items-center hover:text-negative"><Trash2 className="h-4 w-4" /></button>
                  )}
                </span>
              </div>
              <p className="mt-2 text-sm whitespace-pre-wrap break-words">{p.content}</p>
            </article>
          ))}
        </>
      )}

      <ConfirmDialog open={!!delId} onOpenChange={(o) => { if (!o) setDelId(null); }}
        onConfirm={() => { if (delId) { excluir.mutate(delId); setDelId(null); } }}
        title="Excluir post?" description="Esta ação não pode ser desfeita." confirmLabel="Excluir" variant="destructive" />
    </div>
  );
}

function Eventos({ isMember, isAdmin }: { isMember: boolean; isAdmin: boolean }) {
  const qc = useQueryClient();
  const [novo, setNovo] = useState(false);
  const [form, setForm] = useState({ title: "", type: "call" as "call" | "desafio", description: "", scheduledAt: "", tierRequired: "start" as ContentTier });
  const eventos = useQuery({ queryKey: ["club-eventos"], queryFn: () => listarEventos(), refetchInterval: 60_000 });
  const invalidate = () => qc.invalidateQueries({ queryKey: ["club-eventos"] });
  const criar = useMutation({
    mutationFn: () => criarEvento({ data: form }),
    onSuccess: (r) => { if (r.ok) { setNovo(false); setForm({ title: "", type: "call", description: "", scheduledAt: "", tierRequired: "start" }); invalidate(); } else toast.error(r.error); },
  });
  const rsvp = useMutation({ mutationFn: (eventId: string) => rsvpEvento({ data: { eventId } }), onSuccess: (r) => { if (r.ok) invalidate(); else toast.error(r.error); } });

  const agora = Date.now();
  const proximos = (eventos.data?.eventos ?? []).filter((e) => new Date(e.scheduledAt).getTime() >= agora);
  const passados = (eventos.data?.eventos ?? []).filter((e) => new Date(e.scheduledAt).getTime() < agora).reverse();

  const Card = ({ e, passado }: { e: EventoRow; passado?: boolean }) => (
    <div className={cn("rounded-2xl border border-border bg-card p-4", passado && "opacity-60")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[11px]">
            <span className={cn("rounded-full px-2 py-0.5 font-semibold", e.type === "call" ? "bg-primary/10 text-primary" : "bg-warning-soft text-warning")}>{e.type === "call" ? "Call" : "Desafio"}</span>
            {e.tierRequired !== "free" && <span className="text-muted-foreground flex items-center gap-1"><Lock className="h-3 w-3" /> {NIVEL_LABEL[e.tierRequired]}+</span>}
          </div>
          <h3 className="font-semibold mt-1.5">{e.title}</h3>
          <p className="text-xs text-muted-foreground">{new Date(e.scheduledAt).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })} · {e.rsvps} confirmado{e.rsvps === 1 ? "" : "s"}</p>
          {e.description && <p className="text-sm mt-2 whitespace-pre-wrap">{e.description}</p>}
        </div>
        {isMember && !passado && (
          <Button size="sm" variant={e.going ? "default" : "outline"} onClick={() => rsvp.mutate(e.id)} disabled={rsvp.isPending}>{e.going ? "Vou" : "Confirmar"}</Button>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-3 mt-3">
      {isAdmin && <Button onClick={() => setNovo(true)} size="sm"><Plus className="h-4 w-4 mr-1" /> Novo evento</Button>}
      {eventos.isPending && <div className="skeleton h-24 rounded-2xl" />}
      {proximos.length === 0 && !eventos.isPending && <p className="text-sm text-muted-foreground text-center py-6">Nenhum evento agendado.</p>}
      {proximos.map((e) => <Card key={e.id} e={e} />)}
      {passados.length > 0 && (
        <details className="pt-2">
          <summary className="text-xs text-muted-foreground cursor-pointer">Passados ({passados.length})</summary>
          <div className="space-y-2 mt-2">{passados.map((e) => <Card key={e.id} e={e} passado />)}</div>
        </details>
      )}

      <Dialog open={novo} onOpenChange={setNovo}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Novo evento</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); criar.mutate(); }} className="space-y-3">
            <div className="space-y-1.5"><Label htmlFor="ev-title">Título</Label><Input id="ev-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label htmlFor="ev-type">Tipo</Label>
                <select id="ev-type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as "call" | "desafio" })} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
                  <option value="call">Call</option><option value="desafio">Desafio</option>
                </select></div>
              <div className="space-y-1.5"><Label htmlFor="ev-tier">Quem vê</Label>
                <select id="ev-tier" value={form.tierRequired} onChange={(e) => setForm({ ...form, tierRequired: e.target.value as ContentTier })} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
                  <option value="free">Grátis (todo mundo)</option><option value="start">Start e Premium</option><option value="premium">Só Premium</option>
                </select></div>
            </div>
            <div className="space-y-1.5"><Label htmlFor="ev-when">Data e hora</Label><Input id="ev-when" type="datetime-local" value={form.scheduledAt} onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })} required /></div>
            <div className="space-y-1.5"><Label htmlFor="ev-desc">Descrição</Label><textarea id="ev-desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" /></div>
            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setNovo(false)}>Cancelar</Button>
              <Button type="submit" disabled={criar.isPending}>{criar.isPending ? "Salvando…" : "Criar evento"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

type AulaForm = { title: string; description: string; videoUrl: string; tierRequired: ContentTier; modulo: string; ordem: number; published: boolean };
const AULA_VAZIA: AulaForm = { title: "", description: "", videoUrl: "", tierRequired: "start", modulo: "", ordem: 0, published: true };

function Aulas({ isAdmin }: { isAdmin: boolean }) {
  const qc = useQueryClient();
  const aulas = useQuery({ queryKey: ["club-aulas"], queryFn: () => listarAulas() });
  const invalidate = () => qc.invalidateQueries({ queryKey: ["club-aulas"] });
  const [editando, setEditando] = useState<{ id: string | null; form: AulaForm } | null>(null);
  const [delId, setDelId] = useState<string | null>(null);
  const [aberta, setAberta] = useState<string | null>(null);

  const salvar = useMutation({
    mutationFn: () => {
      if (!editando) return Promise.resolve({ ok: false as const, error: "Nada a salvar" });
      const d = { ...editando.form, description: editando.form.description || undefined, videoUrl: editando.form.videoUrl || undefined, modulo: editando.form.modulo || undefined };
      return editando.id ? editarAula({ data: { id: editando.id, ...d } }) : criarAula({ data: d });
    },
    onSuccess: (r) => { if (r.ok) { setEditando(null); invalidate(); } else toast.error(r.error); },
  });
  const excluir = useMutation({ mutationFn: (id: string) => excluirAula({ data: { id } }), onSuccess: invalidate });

  const porModulo = new Map<string, AulaRow[]>();
  for (const a of aulas.data?.aulas ?? []) {
    const k = a.modulo ?? "Geral";
    porModulo.set(k, [...(porModulo.get(k) ?? []), a]);
  }

  return (
    <div className="space-y-4 mt-3">
      {isAdmin && <Button size="sm" onClick={() => setEditando({ id: null, form: AULA_VAZIA })}><Plus className="h-4 w-4 mr-1" /> Nova aula</Button>}
      {aulas.isPending && <div className="skeleton h-24 rounded-2xl" />}
      {!aulas.isPending && porModulo.size === 0 && <p className="text-sm text-muted-foreground text-center py-6">Nenhuma aula publicada ainda.</p>}

      {[...porModulo.entries()].map(([modulo, lista]) => (
        <section key={modulo} className="space-y-2">
          <h3 className="eyebrow">{modulo}</h3>
          {lista.map((a) => {
            const embed = videoEmbedUrl(a.videoUrl);
            const open = aberta === a.id;
            return (
              <article key={a.id} className={cn("rounded-2xl border border-border bg-card overflow-hidden", !a.published && "opacity-60")}>
                <button type="button" onClick={() => a.liberada && setAberta(open ? null : a.id)} className="w-full text-left p-4 flex items-start gap-3">
                  <div className={cn("h-10 w-10 rounded-xl grid place-items-center shrink-0", a.liberada ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                    {a.liberada ? <PlayCircle className="h-5 w-5" /> : <Lock className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-semibold">{a.title}</h4>
                      <span className="text-[10px] rounded-full px-2 py-0.5 bg-muted text-muted-foreground">{NIVEL_LABEL[a.tierRequired]}{a.tierRequired !== "free" ? "+" : ""}</span>
                      {!a.published && <span className="text-[10px] rounded-full px-2 py-0.5 bg-warning-soft text-warning">rascunho</span>}
                    </div>
                    {!a.liberada && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Aula do plano {NIVEL_LABEL[a.tierRequired]}. <Link to="/club/assinar" search={{ plan: a.tierRequired === "premium" ? "premium" : "start" }} className="text-primary font-semibold underline">Assinar</Link>
                      </p>
                    )}
                  </div>
                  {isAdmin && (
                    <span className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => setEditando({ id: a.id, form: { title: a.title, description: a.description ?? "", videoUrl: a.videoUrl ?? "", tierRequired: a.tierRequired, modulo: a.modulo ?? "", ordem: a.ordem, published: a.published } })} aria-label="Editar aula" className="h-11 w-11 -m-2 grid place-items-center text-muted-foreground hover:text-primary"><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => setDelId(a.id)} aria-label="Excluir aula" className="h-11 w-11 -m-2 grid place-items-center text-muted-foreground hover:text-negative"><Trash2 className="h-4 w-4" /></button>
                    </span>
                  )}
                </button>
                {open && a.liberada && (
                  <div className="px-4 pb-4 space-y-3">
                    {embed ? (
                      <div className="aspect-video w-full overflow-hidden rounded-xl bg-black">
                        <iframe src={embed} title={a.title} className="h-full w-full" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                      </div>
                    ) : a.videoUrl ? (
                      <a href={a.videoUrl} target="_blank" rel="noreferrer" className="text-sm text-primary underline">Abrir vídeo</a>
                    ) : null}
                    {a.description && <p className="text-sm whitespace-pre-wrap">{a.description}</p>}
                  </div>
                )}
              </article>
            );
          })}
        </section>
      ))}

      <Dialog open={!!editando} onOpenChange={(o) => { if (!o) setEditando(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editando?.id ? "Editar aula" : "Nova aula"}</DialogTitle></DialogHeader>
          {editando && (
            <form onSubmit={(e) => { e.preventDefault(); salvar.mutate(); }} className="space-y-3">
              <div className="space-y-1.5"><Label htmlFor="au-title">Título</Label><Input id="au-title" value={editando.form.title} onChange={(e) => setEditando({ ...editando, form: { ...editando.form, title: e.target.value } })} required /></div>
              <div className="space-y-1.5"><Label htmlFor="au-video">URL do vídeo (YouTube não listado ou Vimeo)</Label><Input id="au-video" type="url" value={editando.form.videoUrl} onChange={(e) => setEditando({ ...editando, form: { ...editando.form, videoUrl: e.target.value } })} placeholder="https://youtu.be/…" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label htmlFor="au-tier">Nível mínimo</Label>
                  <select id="au-tier" value={editando.form.tierRequired} onChange={(e) => setEditando({ ...editando, form: { ...editando.form, tierRequired: e.target.value as ContentTier } })} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
                    <option value="free">Grátis</option><option value="start">Start</option><option value="premium">Premium</option>
                  </select></div>
                <div className="space-y-1.5"><Label htmlFor="au-ordem">Ordem</Label><Input id="au-ordem" type="number" value={editando.form.ordem} onChange={(e) => setEditando({ ...editando, form: { ...editando.form, ordem: Number(e.target.value) || 0 } })} /></div>
              </div>
              <div className="space-y-1.5"><Label htmlFor="au-modulo">Módulo</Label><Input id="au-modulo" value={editando.form.modulo} onChange={(e) => setEditando({ ...editando, form: { ...editando.form, modulo: e.target.value } })} placeholder="Ex: Investimentos, Cripto, Mentalidade" /></div>
              <div className="space-y-1.5"><Label htmlFor="au-desc">Descrição</Label><textarea id="au-desc" value={editando.form.description} onChange={(e) => setEditando({ ...editando, form: { ...editando.form, description: e.target.value } })} rows={4} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" /></div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editando.form.published} onChange={(e) => setEditando({ ...editando, form: { ...editando.form, published: e.target.checked } })} /> Publicada</label>
              <DialogFooter className="gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={() => setEditando(null)}>Cancelar</Button>
                <Button type="submit" disabled={salvar.isPending}>{salvar.isPending ? "Salvando…" : "Salvar aula"}</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!delId} onOpenChange={(o) => { if (!o) setDelId(null); }}
        onConfirm={() => { if (delId) { excluir.mutate(delId); setDelId(null); } }}
        title="Excluir aula?" description="Esta ação não pode ser desfeita." confirmLabel="Excluir" variant="destructive" />
    </div>
  );
}
```

- [ ] **Step 2: Navegação (`AppShellV2.tsx`)**

Adicionar `Users` já está importado. Trocar os blocos `NAV` e `BOTTOM_NAV`:

```ts
const NAV = [
  { to: "/app", label: "Hoje", icon: Home, hint: "Resumo do dia" },
  { to: "/fluxo", label: "Fluxo", icon: CalendarDays, hint: "Projeção mensal" },
  { to: "/gastos", label: "Gastos", icon: Receipt, hint: "Contas fixas" },
  { to: "/club", label: "Clube", icon: Users, hint: "Comunidade PlanilhaClub" },
  { to: "/parcelas", label: "Parcelas", icon: CreditCard, hint: "Compras no cartão" },
] as const;
```

```ts
const BOTTOM_NAV = [...NAV.slice(0, 4)] as const;
```

(`Users` precisa entrar no import do `lucide-react` se ainda não estiver.) "Tarefas" continua em `MORE`.

- [ ] **Step 3: `config.tsx` — PRO Anual vira Premium**

Linhas 411–416, substituir o primeiro item de `PLANOS`:

```ts
    {
      id: "premium" as const, nome: "PlanilhaClub Premium", valor: 358.8, detalhe: "12x R$ 29,90",
      features: ["Sistema hospedado por 12 meses", "Comunidade PlanilhaClub", "Calls e desafios semanais", "Canal fechado de membros"],
      tag: "Mais popular",
    },
```

Linha 571, o `onClick`:

```ts
onClick={() => plano.id === "premium"
  ? nav({ to: "/club/assinar", search: { plan: "premium" } })
  : nav({ to: "/checkout", search: { plan: plano.id } })}
```

- [ ] **Step 4: `Paywall.tsx` — CTA para o Premium**

Linhas 78–84:

```tsx
<Link
  to="/club/assinar"
  search={{ plan: "premium" }}
  className="cta-pill w-full inline-flex items-center justify-center gap-2 px-6 py-3 text-sm tap-target"
>
  Assinar o PlanilhaClub Premium <ArrowRight className="h-4 w-4" />
</Link>
```

E o texto da linha 54: `assine o PRO` → `assine o PlanilhaClub Premium`.

- [ ] **Step 5: Lint, compile, checklist**

```bash
bunx eslint src/routes/_authenticated/club.tsx src/components/AppShellV2.tsx src/routes/_authenticated/config.tsx src/components/Paywall.tsx --fix
for r in /club /app /config "/club/assinar?plan=premium"; do curl -s -o /dev/null -w "$r %{http_code}\n" "http://localhost:5184$r"; done
```

Expected: todos `200`. Checklist manual (usuários de teste no sandbox):
- grátis: `/club` mostra ofertas, feed público sem composer, aba fechado trancada, eventos `members` não aparecem, sem botão "Confirmar".
- Start: composer aparece, canal fechado abre, `/config` mostra "Baixar planilha" (fluxo existente), app continua sob regra grátis.
- Premium: `getSubscriptionStatus` retorna `ativo` (paywall some); após expirar via cron, paywall volta.
- admin: botões fixar/excluir em qualquer post, "Novo evento", "Nova aula" (criar, editar, rascunho, excluir); outro usuário não vê e `fixarPost`/`criarAula` via RPC devolvem erro de admin.
- aulas: grátis abre aula `free`, vê `start`/`premium` travadas com CTA e o servidor não manda `videoUrl` delas; Start abre `free`+`start`; Premium abre tudo. YouTube e Vimeo viram iframe; URL fora do padrão vira link.
- eventos: grátis só vê `free`; Start vê `free`+`start`; Premium vê tudo.
- `/club/assinar` abre para usuário com status `inativo`.

- [ ] **Step 6: Commit e push**

```bash
git add src/routes/_authenticated/club.tsx src/components/AppShellV2.tsx src/routes/_authenticated/config.tsx src/components/Paywall.tsx src/routeTree.gen.ts
git commit -m "feat(club): pagina /club (aulas, feed, eventos, moderacao), Clube na nav, PRO Anual vira PlanilhaClub Premium

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push origin main
```

---

### Task 8: Subdomínio `club.planilhafuturo.com.br`

**Files:**
- Modify: `vercel.json`

**Estado no início da task (feito em 2026-09-04, antes desta task):**
- Zona `planilhafuturo.com.br` criada na Cloudflare (id `951765833b3ea28e95fcc412509e2e09`), status `pending` até a troca de nameservers. Nameservers: `casey.ns.cloudflare.com`, `evangeline.ns.cloudflare.com`.
- Registros já replicados na zona, todos DNS-only: `A @ → 216.198.79.1`, `CNAME www → 66de7af61dc9c545.vercel-dns-017.com`, `CNAME club → cname.vercel-dns.com`, `TXT _dmarc → "v=DMARC1; p=none;"`. A Hostinger bloqueia consulta `ANY`; MX e SPF não apareceram nas consultas públicas — antes de trocar, o usuário confere no painel da Hostinger se existe algum registro de email e me passa para replicar.
- Projeto Vercel `planilhafuturo2-0` tem `www.planilhafuturo.com.br` e o apex; `club` ainda não. A CLI `vercel` nesta máquina não está logada.

- [ ] **Step 1: Rewrites por host no `vercel.json`**

Substituir o arquivo inteiro por:

```json
{
  "crons": [
    { "path": "/api/cron", "schedule": "0 12 * * *" },
    { "path": "/api/keepalive", "schedule": "0 6 * * *" }
  ],
  "rewrites": [
    {
      "source": "/",
      "has": [{ "type": "host", "value": "club.planilhafuturo.com.br" }],
      "destination": "/club"
    },
    {
      "source": "/assinar",
      "has": [{ "type": "host", "value": "club.planilhafuturo.com.br" }],
      "destination": "/club/assinar"
    }
  ]
}
```

Só `/` e `/assinar` são reescritos; qualquer outro caminho no subdomínio serve a mesma app sem mudança, então `/club/...`, `/auth`, `/app` continuam funcionando lá.

- [ ] **Step 2: Commit e push**

```bash
git add vercel.json
git commit -m "feat(club): rewrites por host para club.planilhafuturo.com.br

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push origin main
```

- [ ] **Step 3: Usuário — nameservers e domínio na Vercel (fora do código)**

1. Hostinger → domínio `planilhafuturo.com.br` → trocar nameservers para `casey.ns.cloudflare.com` e `evangeline.ns.cloudflare.com`. Propagação até 24h; `www` continua no ar porque o registro é idêntico na zona nova.
2. Vercel → projeto `planilhafuturo2-0` → Settings → Domains → Add `club.planilhafuturo.com.br`. Como o CNAME já aponta para `cname.vercel-dns.com`, a Vercel valida sozinha e emite o TLS.

- [ ] **Step 4: Verificar**

```bash
nslookup -type=NS planilhafuturo.com.br 8.8.8.8      # casey/evangeline
nslookup club.planilhafuturo.com.br 8.8.8.8          # cname.vercel-dns.com
curl -s -o /dev/null -w "%{http_code}\n" https://club.planilhafuturo.com.br/           # 200, conteúdo de /club
curl -s -o /dev/null -w "%{http_code}\n" https://club.planilhafuturo.com.br/assinar    # 200
curl -s -o /dev/null -w "%{http_code}\n" https://www.planilhafuturo.com.br/app         # 200 (nada quebrou no www)
```

No navegador: `club.planilhafuturo.com.br` mostra a página do clube; login lá funciona (é a mesma conta; sessão é separada por origem, decisão do spec).

---

## Desvios aplicados na execução (2026-09-04)

O código na branch `feat/planilhaclub` difere dos blocos acima nestes pontos, todos vindos de achados de revisão. O código é a referência; este plano fica como histórico.

- **Task 1:** todas as policies levam `TO authenticated`; `REVOKE ALL ... FROM anon` e `GRANT` explícitos por tabela (já refletido no bloco SQL acima).
- **Task 3:** `ativarMembership` faz o claim com `.neq("status","active")` (atômico por membership) e compensa a expiração da anterior se o claim falhar; inserts de membership checam `error`; cartão aprovado sem linha/ativação gera evento `club_erro` e devolve `ok:false`; Premium usa `garantirPremiumNoApp` (linha própria `"PlanilhaClub Premium"`, nunca renomeia Vitalício/PRO Anual) em vez de `upsertAssinatura`; downgrade Premium→Start na renovação revoga o app; `EventoTipo` ganhou `club_erro`.
- **Task 2:** `podeReembolsar` exige `0 <= agora − início <= 7 dias` (início no futuro, após renovação antecipada, não abre janela).
- **Task 5:** loop do cron isola cada membership em `try/catch` e devolve `erros`.
- **Task 6:** `rsvpEvento` valida `podeVer(tier, evento.tier_required)`; `excluirPost` devolve erro quando nada foi apagado; leituras logam `error` em vez de engolir.
- **Task 7:** card de aula é `div role="button"` (sem botão aninhado); query do canal fechado só dispara para membro; `_authenticated/route.tsx` deixa membro do clube passar pelo paywall em `/club*` e mostra o banner de renovação fora de `/club`.
- **Pendências humanas antes do merge:** aplicar `009_planilhaclub.sql` e regenerar `src/integrations/supabase/types.ts` (remover o `any` de `getAdminDb`); sandbox Efí (Pix 238,80 com "Já paguei" duplicado; cartão 12x aprovado e recusado; avulsa→Start 168,80; cron com `CRON_TOKEN`); nameservers na Hostinger e domínio `club.` na Vercel. **Ordem de deploy:** migration → verificar → código.
- **Follow-ups parqueados:** `verificarAssinaturaClube`/`ativarVitalicioClube` não checam o retorno de `ativarMembership` (Pix é re-tentável; Vitalício fica preso 24h até o cron limpar a `pending`); corrida entre dois checkouts distintos do mesmo usuário falha com erro genérico (índice único segura); N+1 em `profiles` no cron; sem cap em `description` de evento; `club.functions.ts`/`club.tsx` grandes (dividir depois); unificar `checkout.tsx` com `CheckoutForm`.

## Self-review

**Spec coverage:** tabelas + `club_tier` + `club_tier_rank` + RLS incluindo `club_lessons` (T1); regras puras incluindo níveis cumulativos e `videoEmbedUrl` (T2); status/checkout/ativação/avulsa→Start/Vitalício/cancelar/reembolso (T3); `CheckoutForm` + `/club/assinar` fora do paywall (T4); aviso 7 dias, expiração com revogação do Premium, limpeza de pendentes (T5); feed com público/fechado, fixar/excluir, eventos em 3 níveis com RSVP, aulas em 3 níveis com CRUD de admin e conteúdo travado não entregue pelo servidor (T6–T7); nav, `config.tsx` e `Paywall` (T7); grátis só leitura (T6 `criarPost`/`rsvpEvento` recusam, T7 esconde composer/RSVP); subdomínio via rewrites por host + DNS na Cloudflare (T8, adendo do spec). Fora do MVP permanece fora.

**Placeholders:** nenhum "TBD"/"implementar depois"; todo passo de código tem o código.

**Type consistency:** `ClubPlan/ClubTier/MembershipStatus/MembershipSource/BillingMethod` definidos em T2 e usados em T3–T7; `MembershipRow`, `ClubStatus`, `PostRow`, `EventoRow` definidos em T3/T6 e consumidos em T4/T7; `criarAssinaturaClube` devolve `metodo: "pix" | "cartao"` e T4 discrimina por `r.metodo`; `verificarRenovacoesClube` (T5) é importada dinamicamente em `push.functions.ts`; `upsertAssinatura` exportada em T3 antes do uso.
