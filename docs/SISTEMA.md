# planilhafuturo 2.0 — Documentação do Sistema

Documentação técnica do SaaS brasileiro de planejamento financeiro pessoal. Explica **como** o sistema funciona, sem expor valores de credenciais.

---

## 1. Visão geral

App de planejamento financeiro pessoal com projeção de fluxo de caixa de até 12 meses, feito para **mobile-first**. O usuário registra gastos fixos, parcelas, desejos, investimentos e produtividade; o app projeta dia a dia o saldo futuro.

**Modelo de negócio (planos):**
| Plano | Preço | O que dá |
|---|---|---|
| Grátis (trial) | R$ 0 | 7 dias com tudo liberado, sem cartão |
| PRO Anual | R$ 250/ano | Tudo + projeção 12 meses + assistente IA + suporte prioritário |
| Vitalício | R$ 450 | Pagamento único, acesso pra sempre |
| Planilha Excel | R$ 70 | Arquivo `Planilha_do_Erick.xlsx` (compra avulsa via Pix) |

Pagamentos processados pela **Efí Pagamentos** (Pix e cartão de crédito).

---

## 2. Stack e arquitetura

- **Framework:** TanStack Start (SSR + server functions) sobre React + TypeScript.
  - Rotas via TanStack Router (file-based, `routeTree.gen`).
  - Server functions (`createServerFn`) expõem RPCs em `/_serverFn/{id}`; o protocolo é o `seroval`.
- **Banco:** Supabase (PostgreSQL) com **Row-Level Security** por usuário.
  - Cliente público (`client.ts`) usa as chaves publishable; servidor de admin (`client.server.ts`) usa a chave `service_role`, que **contorna a RLS** — só deve ser importado em código de servidor.
- **Auth:** Supabase Auth (email/senha + Google OAuth via Lovable Cloud Auth popup).
- **Pagamentos:** Efí Pagamentos (API Pix + API Cobranças), com certificado mTLS.
- **IA:** Gemini (via chave do usuário no navegador) para o assistente financeiro; modelo `gemini-2.0-flash-lite`.
- **Deploy:** Vercel (build via `vite build`; deploy dispara por push no git).
- **Estilo:** Tailwind CSS + shadcn/ui (variantes `positive/negative/warning`).

### Camadas de dados

1. **Supabase (produção)** — banco de verdade, com RLS.
2. **localStorage (`local-db.ts`)** — modo de dados local (dev/fallback), mesmas "tabelas" com prefixo `pf_`.
3. **Migração** — utilitário que importa dados de `localStorage` → Supabase na primeira entrada autenticada.

---

## 3. Estrutura de pastas

```
src/
  server.ts                    # entrada do servidor SSR (middlewares de erro + segurança + CSP)
  start.ts                     # cria a instância TanStack Start
  router.tsx                   # router + QueryClient
  routes/                      # páginas (ver seção Rotas)
    _authenticated/            # layout protegido (exige sessão)
  lib/
    efi-service.ts             # cliente Efí (Pix + cartão) — server-only
    assinatura.functions.ts    # server functions de assinatura (checkout, ativação)
    planilha-compra.functions.ts # server functions de compra avulsa (planilha)
    waitlist.functions.ts      # server function da waitlist
    chat.functions.ts          # server function do chat da landing (Futura)
    ai-service.ts              # cliente Gemini no navegador (chat autenticado)
    finance.ts                 # motor de projeção financeira
    supabase-db.ts / db.ts     # CRUD sobre Supabase (db.ts é o facade)
    local-db.ts                # CRUD sobre localStorage
    migrate-local-to-supabase.ts
    auth-context.tsx           # AuthProvider (signIn/signUp/Google/logout)
    format.ts / utils.ts       # formatação BRL, datas, cn()
    error-capture.ts / error-page.ts
  integrations/supabase/
    client.ts                  # cliente público (publishable)
    client.server.ts           # cliente admin (service_role)
    auth-attacher.ts           # injeta Bearer token nas server functions
    auth-middleware.ts         # valida JWT em server functions protegidas
  components/
    AppShell.tsx               # shell autenticado (sidebar/bottom nav/chat)
    ChatWidget.tsx             # chat IA (todas as páginas autenticadas)
    dashboards/                # componentes do fluxo tipo planilha
supabase/migrations/           # schema SQL
server-assets/                 # Planilha_do_Erick.xlsx
sensivel/                      # SECREDOS (gitignored): certificados Efí, creds
```

---

## 4. Banco de dados (Supabase)

### Tabelas principais (`000_create_tables.sql`)

Todas as tabelas de usuário têm `user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE` e colunas `created_at`/`updated_at`.

| Tabela | Conteúdo |
|---|---|
| `profiles` | Perfil do usuário (id = `auth.uid()`). Saldo inicial, renda mensal, meta de renda fixa, meses de reserva de emergência, plano, trial (`trial_started_at`/`trial_ends_at`), `onboarding_completed`, `migration_completed_at`. |
| `gastos_fixos` | Contas recorrentes: descrição, valor, categoria (Moradia/Saúde/Lazer/…), `tipo` (P=Parcelado, A=Assinatura, C=Contrato), `frequencia` (mensal/anual), `dia` do vencimento, `mes_anual` (só anual), `forma` de pagamento, `ativo`. |
| `parcelas` | Compras parceladas no cartão: `valor_total`, `qtd_parcelas`, `parcela_inicial`, `data`, `cartao`, `categoria`. |
| `desejos` | Metas/sonhos: item, valor, tipo, `parcelado`, `qtd_parcelas`. |
| `caixinhas` | Metas de economia: `nome`, `meta`, `atual`. |
| `investimentos` | Carteira: `nome`, `tipo` (CDB/Fundo/Tesouro/Ação/Cripto/Outro), `renda`, `valor_aplicado`, `posicao_atual`, `vencimento`. |
| `tarefas` | Lembretes: descrição, valor, `data`, `status` (pendente/feito/atrasado), `tipo`. |
| `focos_diarios` | Foco diário (produtividade): `data`, `texto`, `feito`, `ordem`. |
| `pomodoros` | Sessões pomodoro: `data`, `duracao_min`, `tarefa`. |
| `habitos` | Hábitos: `nome`, `icone`, `cor`, `dias_semana`, `meta_semanal`, `ativo`. |
| `habitos_registros` | Registro diário de hábito (UNIQUE por `habito_id`+`data`). |
| `lancamentos` | Lançamentos avulsos do fluxo: `data`, `descricao`, `tipo` (`entrada_fixa`/`entrada_diaria`/`saida_diaria`), `valor`. |
| `assinaturas` | Assinaturas: `user_id`, `plano`, `status` (ativo), campos legados `stripe_customer_id`/`stripe_subscription_id`. |
| `compras_avulsas` | Compras únicas (ex.: planilha R$ 70): `item`, `valor`, `status`, `txid`. |
| `notas` | Quadro Kanban (005): `titulo`, `conteudo`, `coluna` (a_fazer/fazendo/feito), `ordem`, `etiqueta`. |
| `waitlist` | Emails da lista de espera (20260723...): `email` UNIQUE, `source`. |
| `pre_pagamentos` | **Pagamentos pré-cadastro** (004): `email`, `plano`, `txid` UNIQUE, `status` (pendente/pago/ativado), `valor`, `pagamento_metodo` (pix/cartao), `paid_at`, `activated_at`, `user_id` (nullable, preenchido ao ativar). |

### Migrações

- `000` — cria todas as tabelas (extension `pgcrypto`).
- `001` — habilita **RLS** em todas as tabelas de usuário, cria política `user_owns` (`auth.uid() = user_id`), e o trigger `handle_new_user()` que **cria o profile automaticamente no signup** (com trial de 7 dias).
- `002` — no-op (política de assinaturas já criada no 001).
- `003` — `compras_avulsas` + RLS.
- `004` — `pre_pagamentos` + índices (`email`, `txid`) + RLS (leitura própria por email/user_id; insert público).
- `005` — `notas` + RLS.
- `20260723...` (datadas) — refinam `profiles` (FK para `auth.users`), criam índices, trigger `set_updated_at()` para `updated_at`, revogam execução pública de triggers/functions, `waitlist`, e recriam as tabelas de produtividade (`focos_diarios`, `habitos`, `habitos_registros`, `pomodoros`).

### RLS (Row-Level Security)

- `profiles`: `auth.uid() = id`.
- Demais tabelas de usuário: `auth.uid() = user_id`.
- `pre_pagamentos`: leitura se `email` bate com o do usuário logado OU `user_id = auth.uid()`; insert público (qualquer um pode iniciar um pagamento).
- `waitlist`: insert público (anon), leitura só via `service_role`.
- O cliente **admin** (`service_role`) ignora todas essas políticas — é a ponte usada pelas server functions para ativar assinaturas e marcar pagamentos.

---

## 5. Autenticação

- **`auth-context.tsx`** (`AuthProvider`) — carrega a sessão no mount, escuta `onAuthStateChange`, e expõe `signIn`/`signUp`/`signInWithGoogle`/`logout`.
- **Página `/auth`** — tabs "Entrar" / "Criar conta". Lê `?email=` e `?plan=` da URL: se vierem, **trava o email** e mostra aviso "Você pagou pelo PRO!" (vindo do checkout pré-cadastro). Após login/cadastro bem-sucedido chama `activatePlanPostSignup`.
- **Rotas protegidas** (`_authenticated/route.tsx`): `beforeLoad` verifica sessão e redireciona para `/auth`; `ssr: false`.
- **Google OAuth** — via Lovable Cloud Auth popup (evita problemas de redirect/porta), sessão propagada para o Supabase.
- **Server-side auth** — `auth-attacher.ts` (middleware de função) injeta o `Authorization: Bearer <token>` do usuário nas chamadas a server functions; `auth-middleware.ts` valida o JWT (`getClaims`) para functions que exigem `requireSupabaseAuth`.

### Trial / planos no banco

- No signup, o trigger cria o profile com `trial_ends_at = now() + 7 dias`.
- `getSubscriptionStatus` (server fn) decide: assinatura `ativo` → **ativo**; senão trial com dias restantes > 0 → **trial**; senão **inativo**.
- `Configurações` mostra o plano atual e botão de upgrade.

---

## 6. Pagamentos (Efí Pagamentos)

### 6.1 Cliente Efí (`efi-service.ts`, server-only)

Duas APIs separadas, cada uma com OAuth próprio:

| API | O que faz | OAuth |
|---|---|---|
| **API Pix** | Cobranças Pix | `POST /oauth/token` |
| **API Cobranças** | Cartão de crédito | `POST /v1/authorize` |

- **Ambientes:** produção e homologação têm hosts diferentes e **certificados mTLS diferentes** (cada ambiente rejeita o certificado do outro). A seleção é feita por uma variável de ambiente `EFI_ENV` (`producao` | `homologacao`) + pares de variáveis com sufixo `_PROD`/`_HOMOLOG` (endpoints, client_id, client_secret, certificado). O helper `envOf(prefix)` lê o sufixo do ambiente ativo.
- **mTLS:** toda requisição (inclusive OAuth) exige o certificado. O `efiFetch()` usa `node:https` com um `https.Agent` configurado com o P12/PEM em base64 (ou `EFI_CERT`+`EFI_KEY`). Sem certificado, a API fecha a conexão.
- **Tokens:** cache por API (`_pixToken`/`_cobToken`), expira com 1 min de folga.

Funções:
- `createPixCharge(valor, descricao, txid?)` → `PUT /v2/cob/{txid}`; corpo com `calendario.expiracao` (1h), `valor.original`, `chave` (chave Pix registrada) e `solicitacaoPagador`. **Não envia `devedor`** (a Efí exige CPF/CNPJ se presente, e o fluxo Pix não coleta). Retorna `txid`, `pixCopiaECola` e o valor. O QR code é renderizado no front com `qrcode.react` (a API não devolve mais `imagemQrcode`).
- `checkPixStatus(txid)` → `GET /v2/cob/{txid}`; retorna `{status, valor}`. `CONCLUIDA` = pago. `404` = `NAO_LOCALIZADO`.
- `createCreditCardCharge(valor, descricao, card)` → `POST /v1/charge/one-step`. **Nunca recebe dados crus do cartão** — recebe `payment_token` gerado no navegador. A Efí retorna HTTP 200 para aprovado E recusado; o `status` do payload (`approved`/`paid`) decide `paid` vs `unpaid`. Recusas retornam `refusal.reason`.
- `verifyWebhook` — checagem básica de token de webhook por query param (quando configurado).

### 6.2 Fluxo pré-cadastro (pagar primeiro, criar conta depois) — `/checkout?plan=anual|vitalicio`

Página **pública** `checkout.tsx`:

1. Usuário escolhe plano (anual/vitalício), digita email e escolhe método (Pix ou Cartão).
2. **Pix:** server fn `createPreSignupCheckout` cria a cobrança na Efí (`createPixCharge`) e registra em `pre_pagamentos` (status `pendente`). A página mostra QR Code + copia-e-cola. "Já paguei" → `verifyPreSignupPayment` consulta `checkPixStatus`; se `CONCLUIDA`, marca `pre_pagamentos.status = pago` + `paid_at`.
3. **Cartão:** o navegador valida (Luhn), carrega a lib `payment-token-efi` do Efí (CDN jsdelivr) e **tokeniza o cartão no browser** (com `payee_code`, brand, número, CVV, validade, titular) → gera `payment_token`. O ambiente do tokenizador é `sandbox` quando `VITE_EFI_ENV` é `homologacao`, e `production` quando `producao` — **deve bater com o `EFI_ENV` da API**, senão a Efí rejeita o token. Só o token vai para o servidor (`createPreSignupCheckout` → `createCreditCardCharge`). Se aprovado, `pre_pagamentos` nasce já `pago`; senão mostra tela de recusa com opção de tentar Pix.
4. **Ativação:** "Criar conta" → redirect para `/auth?email=x&plan=anual`. O email vem travado. Após cadastro/login, `activatePlanPostSignup(email)`:
   - localiza `pre_pagamentos` com esse email, `status = pago`, `activated_at` nulo;
   - cria/atualiza a `assinaturas` (via admin, `upsertAssinatura`) e marca `plano` no profile;
   - marca o `pre_pagamentos` como `ativado` + `user_id`.
   - Redundância: a rota autenticada (`route.tsx`) também tenta `activatePlanPostSignup` no mount (catch-all para quem logou por outra via).

### 6.3 Fluxo pós-cadastro (já logado, via Configurações)

- `createCheckoutSession` → gera Pix para o plano escolhido (sem `pre_pagamentos`, usuário já existe).
- `verifyPayment` → consulta status, e se `CONCLUIDA` chama `upsertAssinatura` (cria ou atualiza a assinatura do usuário — usa `maybeSingle` para não duplicar linha).

### 6.4 Compra avulsa (Planilha do Erick, R$ 70)

`planilha-compra.functions.ts` — mesma base Pix:
1. `criarCompraPlanilha` (login obrigatório) → Pix R$ 70 + registro em `compras_avulsas` (status `pendente`).
2. `verificarCompraPlanilha` → se `CONCLUIDA`, marca `pago`.
3. `baixarPlanilha` → verifica se o usuário pagou e devolve o `.xlsx` em base64 (lido de `server-assets/`).

### 6.5 Segurança de rede

`start.ts` aplica **CSP** restritiva: scripts só de `self` + jsdelivr (lib de tokenização), connect-src liberado apenas para Supabase, os hosts Efí (prod/homolog), o tokenizador Efí/anti-fraude e APIs públicas usadas pelo app. Também define `X-Frame-Options: DENY`, `X-Content-Type-Options`, `Referrer-Policy`, COOP/CORP e `Permissions-Policy` (câmera/mic/geo desativados).

---

## 7. Motor de projeção financeira (`finance.ts`)

- `valorParcelaNoMes()` — parcela que vence em determinado mês (leva em conta `qtd_parcelas` e `parcela_inicial`).
- `saidaFixaDia()` — quanto um gasto fixo custa em um dia específico.
- `computaMes(y, m0, saldoInicial, gastos, parcelas, lanc)` — monta o **fluxo diário** do mês (saldo evolui dia a dia somando entradas e subtraindo saídas fixas, parcelas e lançamentos) — base da projeção de 12 meses.
- `totalGastoFixoMensal()`, `parcelasNoMes()` — agregados usados nos cards.

Formatação (`format.ts`): `brl()` (R$ pt-BR), `num()`, nomes de meses, `daysInMonth`, `monthKey`, `isoDate`.

---

## 8. IA / Chat

### Chat autenticado (`ChatWidget.tsx` + `ai-service.ts`)

- Presente em **todas as páginas autenticadas** (montado no `AppShell`), FAB posicionado acima da bottom nav. `appData` é opcional (fallback zeros) para quando não há dados carregados.
- Chama a **Gemini** direto do navegador com a chave do usuário (guardada em `localStorage`, configurável em Configurações > IA).
- `buildSystemPrompt(appData)` monta o contexto com saldo, entradas/saídas, projeção e a **estrutura das tabelas**, ensinando a IA a responder com **ações JSON** (`add_lancamento`) que o `parseAction` extrai e o widget executa (`insertRow("lancamentos", …)`).
- Fallback amigável de erros (ex.: "Configure sua chave da API Gemini…").

### Chat da landing — "Futura" (`chat.functions.ts`)

- Server function que chama o gateway de IA (Lovable) com um **system prompt fixo** em pt-BR: conhece produto, planos, preços e regras de venda (CTA, não prometer retorno, LGPD, PWA, etc.).
- Trata 429/402 com respostas amigáveis.

---

## 9. Migração localStorage → Supabase

`migrate-local-to-supabase.ts`:
- Detecta dados em `localStorage` (`pf_*` + `fluxo_lancamentos_v1`), mostra banner no app.
- `migrateLocalDataToSupabase(userId)` — por linha, verifica se já existe por `id`, insere com `user_id` (ou `id = userId` em `profiles`), ignora duplicatas (`23505`), e grava `profiles.migration_completed_at` (idempotente).
- `clearLocalData()` limpa o storage após sucesso.

---

## 10. Rotas

| Rota | Público? | Descrição |
|---|---|---|
| `/` (index) | Sim | Landing; CTAs de pricing vão para `/checkout` |
| `/checkout?plan=` | Sim | Checkout pré-cadastro (Pix/cartão) |
| `/auth` | Sim | Login/cadastro (email travado vindo do checkout) |
| `/auth.callback` | Sim | Callback de OAuth |
| `/docs`, `/termos`, `/privacidade`, `/cookies` | Sim | Páginas legais |
| `/pv2` | Sim | Página de teste/versão |
| `/onboarding` | Parcial | Fluxo de boas-vindas |
| `/_authenticated/app` | Autenticado | **Hoje** — resumo do dia |
| `/_authenticated/fluxo` | Autenticado | **Fluxo** — projeção mensal (planilha) |
| `/_authenticated/gastos` | Autenticado | **Gastos** — contas fixas |
| `/_authenticated/parcelas` | Autenticado | **Parcelas** — compras no cartão |
| `/_authenticated/investimentos` | Autenticado | **Investimentos** — carteira |
| `/_authenticated/mercado` | Autenticado | **Mercado** — indicadores |
| `/_authenticated/desejos` | Autenticado | **Desejos** — metas & sonhos |
| `/_authenticated/tarefas` | Autenticado | **Tarefas** — lembretes |
| `/_authenticated/produtividade` | Autenticado | **Foco & Notas** — pomodoro, hábitos, kanban |
| `/_authenticated/config` | Autenticado | **Configurações** — perfil, plano, upgrade, chave de IA |

O shell autenticado (`AppShell`) tem sidebar (desktop) + bottom nav de 5 itens (mobile) + sheet "Mais".

---

## 11. Variáveis de ambiente

Apenas **nomes e propósito** (valores ficam em `.env`/Vercel, fora do repositório).

### Supabase
| Variável | Uso |
|---|---|
| `VITE_SUPABASE_URL` | URL do projeto (cliente) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Chave publishable do cliente (exposta no bundle) |
| `SUPABASE_URL` | URL (server functions) |
| `SUPABASE_PUBLISHABLE_KEY` | Chave publishable (server functions) |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave admin `service_role` (**contorna RLS** — só server) |

### Efí Pagamentos
| Variável | Uso |
|---|---|
| `EFI_ENV` | Seleciona ambiente: `producao` ou `homologacao` (define qual sufixo é lido) |
| `EFI_PIX_ENDPOINT_PROD` / `EFI_PIX_ENDPOINT_HOMOLOG` | Host da API Pix de cada ambiente |
| `EFI_COBRANCAS_ENDPOINT_PROD` / `EFI_COBRANCAS_ENDPOINT_HOMOLOG` | Host da API Cobranças (cartão) de cada ambiente |
| `EFI_CLIENT_ID_PROD` / `EFI_CLIENT_ID_HOMOLOG` | Client ID (OAuth) de cada ambiente |
| `EFI_CLIENT_SECRET_PROD` / `EFI_CLIENT_SECRET_HOMOLOG` | Client Secret (OAuth) de cada ambiente |
| `EFI_PFX_PROD` / `EFI_PFX_HOMOLOG` | Certificado mTLS (P12 em base64) de cada ambiente |
| `EFI_PFX_PASS` | Senha do certificado (opcional; os atuais têm senha vazia) |
| `EFI_CERT` / `EFI_KEY` | Alternativa PEM ao P12 |
| `EFI_PIX_KEY` | Chave Pix registrada na Efí (colocada na cobrança) |
| `VITE_EFI_PAYEE_CODE` | Identificador de conta (payee_code) p/ tokenização do cartão no browser — **vira build** |
| `VITE_EFI_ENV` | Ambiente do **tokenizador** do cartão no browser (`homologacao`→sandbox, `producao`→production) — **vira build**; deve bater com `EFI_ENV` |
| `EFI_WEBHOOK_TOKEN` | Token opcional p/ validar webhooks |

### IA / outros
| Variável | Uso |
|---|---|
| `LOVABLE_API_KEY` | Chave do gateway de IA (chat "Futura" da landing) |
| `VITE_EFI_PAYEE_CODE` | (ver acima) |

**Padrão de ambientes duplos:** basta registrar os dois conjuntos (`_PROD` e `_HOMOLOG`) na Vercel e trocar `EFI_ENV` + redeploy para alternar entre teste e produção — nenhuma credencial muda.

---

## 12. Deploy (Vercel)

- Deploy automático por push no git.
- **Alterar variáveis de ambiente não redeploya sozinho** — depois de mudar `EFI_ENV` (ou qualquer variável), é preciso fazer um novo deploy.
- `VITE_EFI_PAYEE_CODE` é **injetado no build**: mudá-lo exige redeploy para ter efeito.
- `sensivel/` (certificados, credenciais, `.p12`) é **gitignored** — não vai para o repositório.
