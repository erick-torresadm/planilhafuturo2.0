# Push de Notificações para o Admin

**Data:** 2026-08-03
**Status:** Aprovado
**Objetivo:** O dono (ericktorresadm@gmail.com) recebe notificações push no celular quando algo acontece na plataforma — cadastro, pagamento, expiração. Sem painel por enquanto. Usuários normais não são afetados.

## Contexto

O app registra eventos de pagamento em 4 tabelas, mas não há nenhum canal de aviso pro dono:

- `pre_pagamentos` — checkout pré-cadastro (email, plano, txid, status `pendente→pago→ativado`, `pagamento_metodo`, `paid_at`, `activated_at`)
- `assinaturas` — PRO Anual / Vitalício (user_id, plano, status `ativo`)
- `compras_avulsas` — Planilha (R$70) e Mentoria (R$497)
- `profiles` — cadastros, `plano`, `positivo_em` (gatilho do "grátis no vermelho")

Não existe papel "admin" global na aplicação — o conceito de workspace/equipe é separado de dados de pagamento. Não há webhook da Efí: a ativação é por polling (server fns `verifyPayment`/`verifyPreSignupPayment`) + fluxo `/obrigado`.

## Requisitos funcionais

1. Só o admin pode assinar push. Identificação **server-side** por email logado (`getAuthedUser()`), contra a env `ADMIN_EMAILS` (fallback: email fixo do dono). O cliente nunca decide por conta própria.
2. Push imediato para:
   - **Novo cadastro** — quando um usuário novo loga pela primeira vez.
   - **Pagamento confirmado** — Pix pago ou cartão aprovado (checkout pré-cadastro) e plano ativado (anual/vitalício).
   - **Compra avulsa** — Planilha ou Mentoria paga.
   - **Usuário ficou positivo** — entrou na graça de 7 dias (`profiles.positivo_em` marcado pela primeira vez).
3. Push diário para **expiração** — usuário ficou positivo e a graça venceu sem pagar (perdeu acesso / caiu no paywall).
4. Sem painel. Só push + o registro interno dos eventos (tabela `notificacoes`) que serve de dedupe e já deixa base pra um painel futuro.
5. Usuário comum: nenhuma mudança visível.

## Arquitetura

### Identificação do admin

`isAdminEmail(email)` — compara `email` (minúsculo) com a lista de `ADMIN_EMAILS` (env, separada por vírgula). Sem essa env, fallback para `ericktorresadm@gmail.com`. Usada exclusivamente em server fns e em um endpoint para gravar a assinatura de push.

### Novas tabelas (DDL manual via Postgres root — ver "Migração")

**`push_subscriptions`**
- `endpoint TEXT PRIMARY KEY` (é a chave natural do Web Push)
- `user_id UUID REFERENCES profiles(id) ON DELETE CASCADE`
- `p256dh TEXT NOT NULL`
- `auth TEXT NOT NULL`
- `created_at TIMESTAMPTZ DEFAULT now()`
- `updated_at TIMESTAMPTZ DEFAULT now()`
- RLS desabilitada (acesso só por server fn / service role). `GRANT` apenas para `service_role`.

**`notificacoes`**
- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `tipo TEXT NOT NULL` — `cadastro | pagamento | compra | positivo | expiracao`
- `titulo TEXT NOT NULL`
- `corpo TEXT NOT NULL`
- `ref_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL` — usuário dono do evento
- `ref_email TEXT` — email do usuário dono do evento (denormalizado; o email pode sumir se o perfil for apagado)
- `ref_plano TEXT` — plano/pagamento quando aplicável
- `ref_valor NUMERIC` — valor quando aplicável
- `dedupe_key TEXT UNIQUE` — chave de dedupe (ex: `cadastro:{user_id}`, `pagamento:{email}:{plano}:{paid_at}`)
- `created_at TIMESTAMPTZ DEFAULT now()`
- RLS desabilitada; acesso só via server fn / service role.

### VAPID + envs (Vercel)

- `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` (mailto: do dono).
- `ADMIN_EMAILS` (opcional; fallback embutido).
- `CRON_TOKEN` — protege o endpoint de cron.

### Dependência

`web-push` (runtime server). Instalada no projeto.

### Fluxo no client (só admin)

1. Ao logar, o client chama a server fn `isAdmin()` (ou a própria rota de assinatura retorna erro se não for admin).
2. Se admin e `Notification.permission !== "granted"` → `Notification.requestPermission()`.
3. Se concedido → `registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: VAPID_PUBLIC })`.
4. `POST` do endpoint + p256dh + auth para a server fn `salvarPushSubscription()` (valida admin, upsert em `push_subscriptions`).
5. `pushManager.getSubscription()` na montagem → se já existe, reenvia (idempotente).
6. Logout → `pushManager.getSubscription()?.unsubscribe()` + remove a linha via server fn.
7. Listeners: `onAuthStateChange` para (des)ativar o fluxo conforme `SIGNED_IN`/`SIGNED_OUT`.

### sw.js

Adicionar handlers:
- `push` → `event.data.json()` → `showNotification(titulo, { body, tag: tipo, icon: "/pwa-icon.png", renotify: true })`. `tag` = tipo de evento, com `renotify` para empilhar mesmo tipo; fallback para texto plano se o payload não for JSON.
- `notificationclick` → foca/janela `"/"` (admin vê só o push; sem deep-link por enquanto).
- Bump da versão do cache (`planilha-v6` → `planilha-v7`).

### Disparo dos eventos

Todos os disparos rodam numa **server fn central** `registrarEvento(tipo, { titulo, corpo, refUser?, refEmail?, refPlano?, refValor?, dedupeKey? })` que:
1. Faz `INSERT` na tabela `notificacoes` com `dedupe_key`. Se `unique_violation` → já notificado, retorna sem push.
2. Lê as `push_subscriptions` ativas.
3. Envia `webpush.sendNotification` para cada uma, em paralelo.
4. Erros de push (410 Gone / 404) → remove a subscription inválida.

Os pontos de chamada (server fns já existentes, service role):

| Evento | Onde | dedupe |
|---|---|---|
| `pagamento` Pix pago (pré-cadastro) | `verifyPreSignupPayment` quando marca `pago` | `pagamento:{email}:{txid}` |
| `pagamento` cartão aprovado | `createPreSignupCheckout` (método cartão, quando `paid`) | `pagamento:{email}:{plano}:{paid_at}` |
| `pagamento` plano ativado (anual/vitalício) | `activatePlanPostSignup` / `verifyPayment` quando `upsertAssinatura` | `ativado:{user_id}:{plano}` |
| `compra` planilha | `activatePlanPostSignup` quando `upsertCompraPlanilha` | `compra:{user_id}:planilha` |
| `compra` mentoria | `activatePlanPostSignup` quando `upsertCompraMentoria` | `compra:{user_id}:mentoria` |
| `positivo` | `getSubscriptionStatus` quando marca `positivo_em` pela primeira vez | `positivo:{user_id}` |
| `cadastro` | no login do usuário (ver abaixo) | `cadastro:{user_id}` |

**Novo cadastro:** não há trigger de perfil; o signup é feito direto via `supabase.auth.signUp` e não há callback server-side confiável. Estratégia: no primeiro login do usuário, uma server fn consulta `auth.users` (service role) por `created_at` e, se `created_at >= cutoff` (data do deploy deste feature), dispara o evento `cadastro` (dedupe por user_id). O `cutoff` evita notificar todos os usuários já existentes no primeiro login após o deploy.

**Expiração (cron diário):**
- `vercel.json` com cron `0 12 * * *` (12h UTC ≈ 9h Brasília).
- Endpoint (rota TanStack Start ou handler Nitro) `GET /api/cron` protegido por `CRON_TOKEN` (query `?token=`).
- Lógica: seleciona usuários com `profiles.positivo_em` setado e **sem** assinatura ativa onde `positivo_em + 7 dias < now()` → para cada um, dispara evento `expiracao` (dedupe `expiracao:{user_id}:{YYYY-MM-DD}` para não repetir no mesmo dia). O push "X perdeu acesso" é um resumo: agrega os que venceram no dia.
- Limite do plano **Hobby** = 1 cron/dia. A expiração é diária; os demais eventos são em tempo real. (Se subir pro plano Pro, trocar pra `*/60` sem tocar no resto.)

## Segurança

- Toda escrita em `push_subscriptions`/`notificacoes` via **service role** (server fn), nunca via client RLS.
- `salvarPushSubscription` e `registrarEvento` validam `isAdminEmail` antes de qualquer escrita.
- O endpoint `/api/cron` exige `CRON_TOKEN`; falha com 401 se ausente/errado.
- O client não expõe as chaves VAPID privadas; só a pública é enviada ao browser.
- Push nunca carrega dados financeiros sensíveis no corpo além do que já é necessário ao admin (email + plano + valor).

## Erros e falhas

- **Push com falha permanente** (410/404): subscription removida da tabela.
- **Dedupe**: `unique` em `dedupe_key` garante que o mesmo evento não gera push duplicado (ex: re-login, re-polling).
- **Falha de rede no disparo**: o INSERT já aconteceu; o push é best-effort. Não há fila de retry nesta versão (aceitável dado o volume).
- **Usuário sem perfil ainda**: `ref_user_id` é `SET NULL`, `ref_email` fica na linha; o push ainda mostra o email.
- **Cron roda sem token**: retorna 401 e não faz nada.

## Migração (manual, como nas anteriores)

DDL das tabelas `push_subscriptions` e `notificacoes` será aplicada via conexão Postgres root (senha em `sensivel/dados.txt`, driver `pg` em diretório temp), seguindo o procedimento já usado em `006_convites.sql`. VAPID keys + `ADMIN_EMAILS` + `CRON_TOKEN` setados via API REST da Vercel (PATCH de env) e/ou `.env`.

## Testes

- Instalar `web-push` e gerar VAPID keys localmente.
- Testar subscribe→salvar→enviar de ponta a ponta com o admin logado (2º device ou browser).
- Confirmar que usuário comum não consegue chamar `salvarPushSubscription` (resposta de erro).
- Testar dedupe: pagar/reverificar 2x → 1 push só.
- Testar cron localmente com um `positivo_em` antigo → push de expiração.
- Verificar no banco que `notificacoes` registra cada evento.

## Fora de escopo (por ora)

- Painel de notificações no app.
- Deep-links do push para páginas específicas.
- Fila de retry / entrega garantida.
- Cron mais frequente que 1x/dia (limitado pelo plano Hobby).
