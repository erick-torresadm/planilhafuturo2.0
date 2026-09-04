# PlanilhaClub — design do MVP

Data: 2026-09-04
Status: aprovado em brainstorming, aguardando revisão do spec escrito.

## Contexto

O planilhafuturo já existe: fluxo diário de 12 meses, gastos fixos, parcelas,
desejos, investimentos, plano grátis liberado enquanto o usuário está no
vermelho (`getSubscriptionStatus`), PRO Anual, Vitalício e uma planilha em
Excel vendida avulsa por R$70 (`compras_avulsas`, item `planilha_erick`).

O PlanilhaClub é uma camada de comunidade por cima desse produto, com dois
planos anuais, para reter usuários e aumentar o LTV. Não é uma marca nova:
vive dentro do planilhafuturo e não usa o nome pessoal do fundador no produto
(decisão de branding já tomada).

## Correções ao spec original

O documento inicial descrevia um stack que não é o deste repositório. As
decisões abaixo foram confirmadas com o usuário durante o brainstorming:

| Spec original dizia | Realidade do repo | Decisão |
|---|---|---|
| Stripe, "já usado no checkout" | Checkout real é Efí (Pix + cartão, `src/lib/efi-service.ts`). Colunas `stripe_*` em `assinaturas` nunca foram usadas. | Só Efí. Stripe fica para uma eventual migração do app inteiro, não começa pelo clube. |
| react-router HashRouter | TanStack Router file-based + TanStack Start | Rotas em `src/routes/`. |
| Edge Functions (Deno) para webhooks | Não existe `supabase/functions`; padrão é rota API do TanStack Start (`api.cron.ts`) | Sem webhook: Efí é cobrança avulsa verificada por polling, como o resto do app. |
| "CSS puro, consistente com o app" | O app usa `motion/react` em todo lugar | Seguir o app: `motion/react` onde já é usado, CSS onde basta. |
| Monorepo `apps/web` + `apps/desktop` (Electron), `vite-plugin-pwa`, `xlsx` | App único, `public/sw.js` manual, Excel servido como base64 embutido | Nada disso é criado. |
| Flag `is_admin` ou `user_id` em env | Já existe `ADMIN_EMAILS` + `isAdminEmail()` + `isAdminLogado` | Reusar. |

O que bate com o repo e é reaproveitado: mesmo projeto Supabase,
`compras_avulsas` para o caso avulsa→Start, `assinaturas.plano = "Vitalício"`
para o caso Vitalício→12 meses, `notificacoes` + push de admin para eventos,
`/api/cron` diário para renovação, `checkout.tsx` como base da UI de pagamento
(Pix + cartão com parcelas via tokenizador Efí).

## Regras de negócio

### Planos

- **PlanilhaClub Start** — R$238,80/ano (12x R$19,90 no cartão ou R$238,80 à
  vista no Pix). Inclui acesso ao clube e a planilha em Excel. A planilha é do
  usuário para sempre, mesmo que cancele o clube depois. Não libera o sistema
  hospedado: o app continua sob a regra "grátis no vermelho".
- **PlanilhaClub Premium** — R$358,80/ano (12x R$29,90 ou R$358,80 à vista).
  Inclui acesso ao clube e o sistema hospedado. Substitui o PRO Anual, que
  deixa de ser vendido separado nas telas do app.

O conteúdo do clube é idêntico para Start e Premium; a única diferença é o
sistema hospedado. Por isso eventos têm dois níveis (`public`, `members`),
não três.

### Casos especiais de acesso

- **Já comprou a planilha avulsa** (`compras_avulsas` `planilha_erick`
  `pago`): entra no Start pagando R$238,80 − R$70 = **R$168,80**
  (`source = upgrade_from_avulsa`). Não paga a planilha de novo.
- **Tem Vitalício** (`assinaturas` `plano = "Vitalício"` `ativo`): ganha 12
  meses de clube sem custo (`source = vitalicio_included`, `plan = premium`).
  Resgata uma vez, por botão no `/club`. Não ganha o Excel (benefício do
  Start; o Vitalício já tem o sistema). Depois dos 12 meses decide se renova.
- **Plano grátis do planilhafuturo**: só leitura do canal público e dos
  eventos públicos. Não posta, não dá RSVP, não baixa a planilha. Canal
  fechado, calls e desafios são de Start/Premium.

### Cobrança, renovação e cancelamento

- Compromisso anual (365 dias a partir da ativação).
- **Renovação assistida**, não débito automático. A Efí faz cobrança avulsa;
  não debita cartão salvo sozinha. Sete dias antes do fim do período o cron
  registra o aviso prévio (obrigatório) e o usuário vê um banner no `/app` e
  no `/club` com botão "Renovar". Renovar gera uma cobrança nova; o novo
  período começa no fim do atual, sem perder dias. Se não pagar até o fim,
  a membership expira.
- **Cancelar a renovação** (`cancel_renewal = true`): sem reembolso
  proporcional; o acesso segue até `current_period_end`.
- **Direito de arrependimento** (CDC art. 49): até 7 dias depois de
  `current_period_start`, em membership paga (`source ≠ vitalicio_included`),
  o usuário solicita reembolso no app. A membership vira `canceled` na hora
  (perde acesso), fica registrado em `notificacoes` (tipo `reembolso`, com
  valor e método) e o admin recebe push. **A devolução do dinheiro é manual
  no painel Efí** neste MVP.

## Modelo de dados

Migration: `supabase/migrations/007_planilhaclub.sql`, aplicada pelo fluxo
atual do projeto. Os MCPs Supabase conectados nesta máquina apontam para
outros projetos e não devem ser usados para aplicar migrations aqui.

```sql
create table club_memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  plan text not null check (plan in ('start','premium')),
  status text not null check (status in ('pending','active','canceled','expired')),
  source text not null check (source in ('new','upgrade_from_avulsa','vitalicio_included')),
  billing_method text check (billing_method in ('a_vista','parcelado_12x')),
  gateway_txid text,
  valor_pago numeric,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_renewal boolean not null default false,
  renewal_notice_sent_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
-- Uma membership ativa por usuário. `pending` pode repetir (Pix não pago);
-- o cron expira pendentes com mais de 24h.
create unique index club_memberships_one_active
  on club_memberships (user_id) where status = 'active';

create table club_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references profiles(id) on delete cascade,
  channel text not null check (channel in ('public','closed')),
  content text not null check (char_length(content) between 1 and 2000),
  pinned boolean not null default false,
  created_at timestamptz default now()
);

create table club_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  type text not null check (type in ('call','desafio')),
  description text,
  scheduled_at timestamptz not null,
  tier_required text not null default 'members' check (tier_required in ('public','members')),
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

create table club_event_rsvps (
  event_id uuid not null references club_events(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (event_id, user_id)
);
```

`pending` significa cobrança Pix gerada e ainda não paga (mesmo padrão de
`compras_avulsas`). Cartão só cria membership depois de aprovado, então nunca
fica `pending`.

### Entitlement em um lugar só

```sql
create or replace function club_tier(uid uuid) returns text
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select plan from club_memberships
      where user_id = uid and status = 'active' and current_period_end > now()
      order by current_period_end desc limit 1),
    'none');
$$;
grant execute on function club_tier(uuid) to authenticated;
```

Não há coluna derivada em `profiles`. RLS e server functions usam a mesma
função, então não existe segunda fonte de verdade.

### RLS

- `club_memberships`: usuário lê só as próprias linhas; escrita só por
  service role.
- `club_posts`: SELECT de `channel = 'public'` para qualquer autenticado;
  `closed` só se `club_tier(auth.uid()) <> 'none'`. INSERT só se
  `club_tier(auth.uid()) <> 'none'` e `author_id = auth.uid()`. DELETE só do
  próprio post. UPDATE nenhum (fixar é ação de admin via service role).
- `club_events`: SELECT de `public` para autenticado; `members` só membro.
  Sem INSERT/UPDATE/DELETE por usuário.
- `club_event_rsvps`: usuário insere/deleta as próprias, e só em evento que
  ele enxerga (subselect com a mesma regra de `club_events`).
- Moderação (excluir ou fixar qualquer post, criar evento) passa por server
  function que checa `isAdminEmail` e usa service role. O banco não sabe quem
  é admin; `ADMIN_EMAILS` já é a fonte.

### Ligação com o que já existe

- **Premium ativado**: além da membership, `upsertAssinatura(user,
  "PlanilhaClub Premium")` em `assinaturas` (status `ativo`). O gate atual do
  app (`getSubscriptionStatus`) libera sem nenhuma alteração. Quando a
  membership Premium expira ou é cancelada, essa linha de `assinaturas` deixa
  de ser `ativo` (status `expirado`).
- **Start ativado**: membership + `compras_avulsas` (`item = planilha_erick`,
  `status = pago`, `valor = 0`, `txid = 'club:<membership_id>'`). O download
  existente (`baixarPlanilha`) passa a funcionar; o gate é no servidor, então
  usuário grátis nunca alcança o arquivo.
- **Avulsa → Start**: não toca em `compras_avulsas` (já está pago); só cobra
  a diferença.

## Server functions — `src/lib/club.functions.ts`

Mesmo padrão de `assinatura.functions.ts`: `createServerFn`, `getAuthedUser`,
service role via `client.server`, retorno `{ ok: false, error }` em vez de
lançar pela RPC.

- `getClubStatus()` → `tier`, membership atual (status, plano, período,
  `cancel_renewal`), e ofertas já resolvidas para o usuário: preço do Start
  (238,80 ou 168,80), preço do Premium, `vitalicioDisponivel`, `avisoRenovacao`
  (quando `renewal_notice_sent_at` está preenchido e ainda não renovou),
  `podeReembolsar` (dentro dos 7 dias).
- `criarAssinaturaClube({ plan, metodo, card? })` → Pix: `createPixCharge`,
  membership `pending` com `gateway_txid`; devolve QR e copia-e-cola. Cartão:
  `createCreditCardCharge` com `installments` (1 a 12); aprovado → ativa na
  hora. O preço é calculado no servidor a partir do plano e do estado do
  usuário; o client envia apenas `plan` e `metodo`.
- `verificarAssinaturaClube({ txid })` → `checkPixStatus`; `CONCLUIDA` ativa.
  Idempotente.
- `ativarMembership(id)` (interna, usada por Pix e cartão) → `status =
  active`, `current_period_start = now()` (ou o fim do período anterior, se
  renovação antes de expirar), `current_period_end = start + 365d`, e os
  efeitos colaterais de Start/Premium descritos acima. Checa o status antes
  de aplicar efeitos: chamar duas vezes não duplica nada.
- `ativarVitalicioClube()` → exige Vitalício ativo e nenhuma membership com
  `source = vitalicio_included` para o usuário; cria membership `premium`
  ativa por 365 dias, sem cobrança.
- `cancelarRenovacaoClube()` → `cancel_renewal = true`.
- `solicitarReembolso()` → valida a janela de 7 dias e a origem paga; marca
  `canceled`, reverte efeitos (Premium perde `assinaturas` ativo; Start
  mantém o Excel, que é do usuário para sempre), grava `notificacoes` tipo
  `reembolso` com valor e método, dispara push de admin.
- `listarPosts({ channel, cursor })`, `criarPost({ channel, content })`,
  `excluirPost({ id })` (próprio ou admin), `fixarPost({ id, pinned })`
  (admin), `listarEventos()`, `criarEvento({...})` (admin),
  `rsvpEvento({ eventId })` (toggle).

Regras puras (sem I/O) ficam em `src/lib/club.rules.ts`: preço por plano e
estado, derivação de tier, datas de período, aviso e janela de reembolso.
Preços centralizados em `CLUB_PLANOS`; o valor da planilha (70) é importado
de `planilha-compra.functions.ts`.

### Leitura via server function, RLS como reserva

`profiles` tem RLS `user_owns`; o client não consegue ler o nome do autor de
outro post, e abrir `profiles` para todo autenticado vazaria email e dados
financeiros (RLS é por linha, não por coluna). Por isso `listarPosts` e
`listarEventos` rodam com service role, fazem o join do primeiro nome e
aplicam a regra de tier no servidor. A RLS da seção anterior segura quem
tentar bater direto no Supabase. É o mesmo padrão do painel `/admin`.

## Renovação e limpeza — passo novo no cron diário

Dentro de `rodarCronExpiracao` (`push.functions.ts`), depois de
`verificarExpirados`, em `try/catch` próprio para que uma falha não derrube a
outra:

1. Memberships `active` com `cancel_renewal = false`, `current_period_end`
   dentro de 7 dias e `renewal_notice_sent_at` nulo → preenche o campo e
   registra evento `renovacao_aviso` (push de admin; o usuário vê o banner via
   `getClubStatus`).
2. Memberships `active` com `current_period_end < now()` → `expired`; Premium
   também perde `assinaturas` ativo.
3. Memberships `pending` com mais de 24h → `expired`.

## Rotas e UI

- `/club` → `src/routes/_authenticated/club.tsx`. Dentro do shell
  (`AppShellV2`), herda auth e paywall. Abas **Feed** e **Eventos**. Topo com
  badge do tier (Grátis, Start, Premium) e o CTA certo para o estado: "Assinar
  o clube", "Ativar meus 12 meses" (Vitalício), "Renovar" (aviso de 7 dias),
  "Expirou — renovar". Banner de aviso prévio quando aplicável.
- `/club/assinar?plan=start|premium` → `src/routes/club.assinar.tsx`, fora
  do `_authenticated` (só sessão, `ssr: false`, como `/admin`). Motivo: quem
  caiu no paywall (`inativo`) precisa conseguir comprar Premium, e o paywall
  bloqueia tudo dentro do `_authenticated`. Página limpa: resumo do plano e
  preço já resolvido pelo servidor, seletor Pix/cartão, `CheckoutForm`. Pago →
  redireciona para `/club`.
- `src/components/CheckoutForm.tsx`: extraído de `checkout.tsx` (Pix com QR,
  copia-e-cola e polling de verificação; cartão com tokenizador Efí e select
  de parcelas até 12x). `checkout.tsx` pré-cadastro **não é alterado** nesta
  sprint; a unificação é follow-up.
- Navegação (`AppShellV2`): sidebar desktop ganha "Clube". No bottom-nav
  mobile, "Clube" entra no lugar de "Tarefas"; "Tarefas" continua no menu
  "Mais".
- Feed: composer só para membro, com toggle público/fechado e limite de 2000
  caracteres. Lista com fixados primeiro, depois mais recentes; cada post
  mostra primeiro nome, canal e hora relativa. Grátis vê o público sem
  composer; aba "fechado" trancada com CTA. Refetch a cada 30s e após postar.
  Admin vê botões de excluir e fixar em qualquer post (`isAdminLogado`).
- Eventos: próximos abertos, passados recolhidos. Card com título, tipo,
  data, nível, contagem de RSVPs e botão "Vou" (toggle) para membro. Admin vê
  "Novo evento" (título, tipo, descrição, data/hora, público ou membros).
- Telas existentes: o card "PRO Anual" em `config.tsx` e no `Paywall` vira
  "PlanilhaClub Premium" apontando para `/club/assinar?plan=premium`.

## Erros e casos de borda

- Cartão recusado: nada é gravado.
- Pix não pago: `pending` não bloqueia nova tentativa (índice único só em
  `active`); cron limpa em 24h.
- Ativação idempotente e preço/tier sempre recalculados no servidor.
- Vitalício não resgata duas vezes.
- Cada passo do cron isolado em `try/catch`; erros são logados e o passo
  seguinte roda.
- Usuário no paywall consegue chegar em `/club/assinar`.

## Verificação

O repositório não tem test runner nem testes. Nesta sprint:

- Regras puras em `club.rules.ts`, sem I/O, prontas para vitest quando o
  usuário quiser adicionar o runner.
- Efí em sandbox (`efiTokenizerEnv`) para Pix e cartão 12x de ponta a ponta.
- Lint e compile de cada rota (`curl` 200) antes de cada commit.
- Checklist manual antes de subir:
  - grátis vê público, não posta, não dá RSVP, não baixa Excel;
  - Start baixa Excel e não ganha o app;
  - Premium ganha o app pelo gate atual e perde ao expirar;
  - avulsa→Start cobra 168,80; novo assinante cobra 238,80/358,80;
  - Vitalício ativa 12 meses sem cobrar, uma vez só;
  - admin exclui, fixa e cria evento; não-admin não vê botão nem consegue
    pela RPC;
  - usuário `inativo` abre `/club/assinar`;
  - reembolso dentro de 7 dias registra evento e derruba acesso; fora dos 7
    dias é recusado.

## Fora do MVP

- Chat em tempo real, DMs, app nativo, gamificação (spec original).
- Realtime do Supabase no feed.
- Estorno automático na Efí.
- Débito automático na renovação (recorrência Efí é outra integração).
- Email de aviso de renovação (o app não envia email hoje).
- Unificar `checkout.tsx` pré-cadastro com `CheckoutForm` e trocar PRO Anual
  por Premium lá.
- Comentários em posts.

## Ordem de implementação (base para o plano)

1. Migration + `club_tier` + RLS.
2. `club.rules.ts` e `club.functions.ts` (status, checkout, ativação, casos
   especiais, cancelamento, reembolso).
3. `CheckoutForm` e `/club/assinar`.
4. Passo de renovação no cron.
5. `/club` com gate, feed e eventos; navegação; troca do PRO Anual em
   `config.tsx` e `Paywall`.
