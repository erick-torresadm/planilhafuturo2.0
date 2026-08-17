<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

# planilhafuturo — Sistema Completo

## Visão Geral

App SaaS de planejamento financeiro pessoal brasileiro. Projeção diária de 12 meses de fluxo de caixa. O usuário enxerga saldo, entradas, saídas, parcelas, investimentos e desejos — tudo em uma visão consolidada com insights inteligentes.

**Stack:** TanStack Start (React SSR) + Supabase (PostgreSQL + Auth + RLS) + Efí Pagamentos (Pix/Cartão) + Vercel

**Idioma:** Todo o código, interface e dados são em Português do Brasil (pt-BR).

## Arquitetura

```
src/
├── routes/                    # Rotas TanStack Router (file-based)
│   ├── __root.tsx             # Root: HTML shell, AuthProvider, PWA setup
│   ├── _authenticated/        # Layout com auth gate + paywall
│   │   ├── route.tsx          # Auth guard + paywall + migração localStorage
│   │   ├── app.tsx            # Dashboard principal "Hoje"
│   │   ├── fluxo.tsx          # Projeção mensal dia-a-dia
│   │   ├── gastos.tsx         # Gastos fixos (CRUD)
│   │   ├── parcelas.tsx       # Parcelas de cartão (CRUD)
│   │   ├── investimentos.tsx  # Carteira de investimentos
│   │   ├── desejos.tsx        # Metas/desejos do usuário
│   │   ├── historico.tsx      # Meses passados
│   │   ├── mercado.tsx        # Indicadores econômicos (USD, Selic, IPCA)
│   │   ├── tarefas.tsx        # Lembretes/to-do
│   │   ├── produtividade.tsx  # Pomodoro, notas, hábitos
│   │   ├── config.tsx         # Perfil, preferências, assinatura
│   │   └── sobre.tsx          # Info do app, PWA install
│   ├── auth.tsx               # Login/cadastro
│   ├── checkout.tsx           # Checkout pré-cadastro (Pix + Cartão)
│   ├── onboarding.tsx         # Onboarding do usuário novo
│   ├── convite.$token.tsx     # Aceite de convite ADM
│   ├── api.cron.ts            # Cron Vercel (expiração diária)
│   └── [paginas estaticas]    # index, privacidade, termos, suporte, guia, docs, cookies
│
├── components/
│   ├── AppShell.tsx           # Layout: sidebar desktop + bottom nav mobile
│   ├── dashboards/index.tsx   # DashboardMercury: KPIs + gráficos Recharts
│   ├── FinanceCoach.tsx       # Motor de insights (regras, sem IA externa)
│   ├── Paywall.tsx            # Tela de bloqueio quando assinatura expira
│   ├── Money.tsx / MoneyInput.tsx  # Formatação BRL
│   ├── WorkspaceSwitcher.tsx  # Alternar entre workspaces (ADM convidado)
│   └── ui/                    # 47 componentes shadcn/ui
│
├── lib/
│   ├── finance.ts             # Core: GastoFixo, Parcela, Lancamento, computaMes()
│   ├── format.ts              # brl(), MESES, daysInMonth(), isoDate()
│   ├── insights.ts            # gerarInsights() — motor de regras financeiras
│   ├── db.ts                  # Abstração DB (re-exporta supabase-db)
│   ├── supabase-db.ts         # CRUD Supabase com RLS (selectAll, insertRow, etc.)
│   ├── local-db.ts            # CRUD localStorage (dev/fallback)
│   ├── assinatura.functions.ts # Server fns: checkout, verificação, status, workspaces
│   ├── efi-service.ts         # Cliente Efí Pagamentos (Pix + Cartão, mTLS)
│   ├── push.functions.ts      # Notificações push admin (VAPID)
│   ├── convite.functions.ts   # Convite ADM por link
│   ├── seguranca.functions.ts # Troca de senha via service role
│   ├── workspace.ts           # Estado de workspace ativo (localStorage)
│   ├── privacy.tsx            # Modo privacidade (mascarar valores)
│   ├── auth-context.tsx       # AuthProvider (signIn, signUp, Google OAuth)
│   ├── server-session.ts      # Validação de token Bearer no server
│   ├── migrate-local-to-supabase.ts # Migração localStorage → Supabase
│   └── demoData.ts            # Dados de demonstração
│
├── hooks/
│   ├── useLancamentosLocal.ts # CRUD lançamentos do dia
│   ├── useExternalData.ts     # Dados econômicos externos
│   ├── usePushNotifications.ts # Inscrição push (admin)
│   ├── useSounds.ts           # Efeitos sonoros
│   └── use-mobile.tsx         # Detecção mobile
│
├── integrations/
│   ├── supabase/
│   │   ├── client.ts          # Supabase client (anon key, client-side)
│   │   ├── client.server.ts   # Supabase admin (service role, server-only)
│   │   ├── auth-attacher.ts   # Middleware: anexa Bearer token no server fn
│   │   └── types.ts           # Tipos gerados do banco
│   └── lovable/               # Integração Lovable Cloud
│
supabase/
├── migrations/
│   ├── 000_create_tables.sql  # 15 tabelas + extensões
│   ├── 001_initial_schema.sql # RLS policies + trigger on_auth_user_created
│   ├── 002-008                # Assinaturas, compras, pre-pagamentos, notas, convites, tarefas, push
│   └── 202607*                # Migrations adicionais
```

## Banco de Dados (15 tabelas principais)

| Tabela | Relação | Descrição |
|--------|---------|-----------|
| `profiles` | identity (id=auth.uid()) | Perfil: nome, email, saldo_inicial, renda_mensal, plano, positivo_em |
| `gastos_fixos` | user_id → profiles | Despesas recorrentes: valor, categoria, tipo (C/A/P), frequência, dia |
| `parcelas` | user_id → profiles | Compras parceladas: valor_total, qtd_parcelas, data, cartao |
| `lancamentos` | user_id → profiles | Lançamentos diários: data, tipo (entrada_fixa/entrada_diaria/saida_diaria), valor |
| `investimentos` | user_id → profiles | Carteira: nome, tipo, valor_aplicado, posicao_atual |
| `desejos` | user_id → profiles | Metas/desejos: item, valor, tipo, parcelado |
| `tarefas` | user_id → profiles | Lembretes: descricao, valor, data, status |
| `assinaturas` | user_id → profiles | Plano ativo: plano, status |
| `pre_pagamentos` | (sem user_id) | Pagamento pré-cadastro: email, plano, txid, status |
| `compras_avulsas` | user_id → profiles | Compras pontuais: planilha, mentoria |
| `convites` | owner_id → profiles | Convites ADM: token, status, expira_em |
| `workspace_members` | owner_id, member_id | Relação owner↔member para workspaces |
| `caixinhas` | user_id → profiles | "Caixinhas" de reserva |
| `focos_diarios`, `pomodoros`, `habitos`, `habitos_registros` | user_id → profiles | Produtividade |
| `push_subscriptions`, `notificacoes` | admin-only | Push notifications |

**RLS:** Todas as tabelas exceto `profiles` usam `auth.uid() = user_id`. Profiles usa `auth.uid() = id`. Policy `user_owns` em todas.

## Modelos de Dados Principais

```typescript
type GastoFixo = {
  id: string; categoria: string; descricao: string; valor: number;
  tipo: "P" | "A" | "C"; // Proteção, Essencial(Apoio?), Conforto
  frequencia: "mensal" | "anual"; dia: number; mes_anual: number | null;
  forma: string; ativo: boolean;
};

type Parcela = {
  id: string; data: string; descricao: string; valor_total: number;
  qtd_parcelas: number; parcela_inicial: number; cartao: string | null;
};

type Lancamento = {
  id: string; user_id?: string; data: string;
  tipo: "entrada_fixa" | "entrada_diaria" | "saida_diaria"; valor: number;
};

type DiaFluxo = {
  data: string; dia: number; entradaFixa: number; entradaDiaria: number;
  saidaFixa: number; saidaDiaria: number; saldo: number;
};
```

## Fluxo Financeiro Core

A função `computaMes()` em `src/lib/finance.ts` é o coração do sistema:
1. Para cada dia do mês, soma entradas fixas + diárias e saídas fixas + diárias
2. Saídas fixas vêm de `gastos_fixos` (pelo dia do mês) + `parcelas` (rateio mensal)
3. Lançamentos diários vêm da tabela `lancamentos`
4. Acumula saldo dia-a-dia (saldo_inicial → saldo do último dia)
5. O `_authenticated/app.tsx` projeta 12 meses usando `computaMes()` em cascata

## Sistema de Assinatura ("Grátis no Vermelho")

**Fluxo:** `src/lib/assinatura.functions.ts`

1. **Grátis** → Usuário novo, nunca ficou positivo. Tudo liberado.
2. **Graça (7 dias)** → Ficou positivo (sobra ≥ R$250 OU investido ≥ R$3.000). Ainda liberado por 7 dias.
3. **Inativo** → Passou 7 dias sem pagar → Paywall bloqueia acesso.
4. **Ativo** → Pagou → Nunca volta ao grátis.

**Pre-signup:** Usuário paga ANTES de criar conta (checkout público `/checkout`). Após signup, `activatePlanPostSignup()` ativa o plano pelo email.

**Gate de workspace:** Se o usuário é ADM de um workspace, herda o plano do dono para aqueles dados, mas NUNCA ganha plano ativo na própria conta.

## Pagamentos (Efí)

**Dual API:** Pix (`pix.api.efipay.com.br`) + Cobranças (`cobrancas.api.efipay.com.br`)
**mTLS:** Certificado client via env vars (`EFI_PFX` ou `EFI_CERT`+`EFI_KEY`)
**Cartão:** Tokenização no browser via lib `payment-token-efi`. Dados do cartão NUNCA chegam ao servidor.

**Planos:**
- PRO Anual: R$ 250 (365 dias)
- Vitalício: R$ 450 (100 anos)
- Planilha do Erick: R$ 70 (compra avulsa)
- Mentoria: R$ 497 (compra avulsa)

## Server Functions (TanStack Start)

Todas as operações de backend usam `createServerFn()`:
- `assinatura.functions.ts` → checkout, verificação, status, workspaces
- `push.functions.ts` → push notifications, cron de expiração
- `convite.functions.ts` → buscar/aceitar convite ADM
- `seguranca.functions.ts` → troca de senha
- `waitlist.functions.ts` → waitlist

**Autenticação server-side:** `server-session.ts` lê o header `Authorization: Bearer` e valida via `supabase.auth.getUser(token)`.

## PWA & Deploy

- **PWA:** Service worker em `/sw.js`, manifest, install prompt
- **Deploy:** Vercel (Hobby plan, 1 cron/dia)
- **Cron:** `/api/cron` roda `verificarExpirados()` diariamente às 12h
- **Build:** `node scripts/gen-assets.mjs && vite build`

## Convenções de Código

- **Componentes:** React function components, hooks customizados
- **State:** TanStack Query para server state, useState para local
- **Forms:** react-hook-form + zod
- **UI:** shadcn/ui (47 componentes), Tailwind CSS v4, class-variance-authority
- **Gráficos:** Recharts (AreaChart, BarChart)
- **Animações:** motion (Framer Motion)
- **Estilo:** Sem comentários no código, funções descritivas em português
- **Alias:** `@/` → `src/`
- **Nomes:** Tabelas e colunas em snake_case no banco, camelCase no React

## Environment Variables Essenciais

```
# Supabase
VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY
SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

# Efí Pagamentos
EFI_CLIENT_ID, EFI_CLIENT_SECRET
EFI_PFX (ou EFI_CERT + EFI_KEY), EFI_PFX_PASS
EFI_PIX_KEY, EFI_WEBHOOK_TOKEN
VITE_EFI_PAYEE_CODE, VITE_EFI_ENV
EFI_*_PROD / EFI_*_HOMOLOG (endpoints por ambiente)

# Push Notifications
VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT
ADMIN_EMAILS

# Cron
CRON_TOKEN
```

## Comandos

```bash
bun run dev        # Desenvolvimento
bun run build      # Build para produção
bun run lint       # ESLint
bun run format     # Prettier
```
