
# Plano — rebrand, landing page e polimento SaaS

Decisões que assumi (você pulou as perguntas):
- **Nome**: `meudindin` como preferência, `meucofrin` como fallback. Verifico `.com.br` no registro.br antes de fechar o logo.
- **Direção visual**: **editorial calmo** (Linear/Notion/Stripe) — off-white quente, serif discreto nos títulos, sans geométrico no corpo, muito respiro, verde-esmeralda só como acento. Sai da cara de "IA seco" sem virar fintech neon.
- **E2E**: Playwright completo em todas as telas, com screenshots.
- **Landing**: hero + prova visual + comparativo com planilha + features + FAQ + waitlist. Motion sutil (fade/parallax/tilt/marquee), nada exagerado.

---

## 1. Pesquisa de referência (rápida, antes de codar)

Rodo em paralelo (subagents) 3 pesquisas curtas:
- Landing pages fintech BR/US premium (Linear, Copilot Money, Monarch, Cushion, Rocket Money, Organizze, Mobills).
- Componentes de motion prontos (Aceternity UI, Magic UI, Motion Primitives, shadcnblocks).
- Padrões de "planilha bonita" (Causal, Sigma, Rows.com, Airtable).

Consolido em 1 moodboard interno (comentário no PR) — não vira arquivo do projeto.

## 2. Marca

- Verifico disponibilidade `meudindin.com.br` / `meucofrin.com.br` via registro.br.
- Gero logo com `imagegen` (premium, transparente): cofrinho minimalista + wordmark. 2 variações → escolho a melhor.
- Salvo em `src/assets/logo.svg` (ou via `lovable-assets` se PNG).
- Atualizo favicon (`public/favicon.png`), `<title>`, meta og.

## 3. Design system (refinar, não reinventar)

`src/styles.css`:
- Base **Paper & Ink cálido**: `--background: oklch(0.985 0.005 85)` (off-white), `--foreground: oklch(0.18 0.01 240)` (quase preto azulado).
- Acento **esmeralda restrito**: `--primary: oklch(0.45 0.09 165)` (só CTAs, foco, estados positivos).
- Cinzas em escala 50→900 baseada em oklch para bordas, sombras, muted.
- Tipografia: **Fraunces** (display, serif variable) + **Geist Sans** (corpo) + **Geist Mono** (números). Substitui Urbanist/Epilogue.
- Radius padrão `10px`, sombras `0 1px 2px / 0 8px 24px -12px` (nada de glow neon).
- Novos utilitários: `.card-quiet`, `.divider-hair`, `.num-lg` (tabular + tracking negativo).

## 4. Landing page (`/` público)

Movo o dashboard atual pra `/app` e libero `/` para a LP. Rotas novas: `src/routes/index.tsx` (LP), `src/routes/_app/` mantém área logada.

Seções da LP (todas com motion via `motion/react` — já compatível com stack):
1. **Nav** — logo + links (Produto, Preços, FAQ) + CTA "Entrar" e "Começar grátis". Blur sticky ao scrollar.
2. **Hero** — headline serif grande ("Veja seus próximos 6 meses de dinheiro. Sem planilha."), sub, 2 CTAs, mockup do app com **tilt suave no mouse** e badge "feito pra quem já usa a planilha do Breno".
3. **Prova social** — marquee com logos/depoimentos (fake temporário, marcado como placeholder).
4. **Comparativo planilha × meudindin** — split screen animado com transição de screenshot da planilha Excel → screenshot do app ao entrar no viewport.
5. **Features (4 cards bento)** — Fluxo diário, Gastos fixos, Parcelas, Desejos & caixinhas. Cada card com micro-animação (Framer `whileInView`).
6. **Como funciona** — 3 passos numerados com stagger reveal.
7. **Screenshots ao vivo** — carrossel horizontal com scroll-linked animation dos 4 principais telas.
8. **Pricing** — 2 planos (Grátis / Pro R$ 19/mês). Toggle mensal/anual.
9. **FAQ** — accordion (shadcn) com 8 perguntas.
10. **CTA final** — waitlist com input de e-mail (grava em tabela `waitlist` no Supabase).
11. **Footer** — minimalista, links legais + logo.

Motion budget: `fade-up` no scroll, `tilt` no mockup, `marquee` nos logos, `stagger` em listas, `blur-in` nos títulos. Sem parallax pesado. Respeita `prefers-reduced-motion`.

## 5. Polimento do app (áreas logadas)

Passa em cada tela e aplica o novo DS + arruma pontas soltas:
- **Dashboard**: mantém estrutura atual (você aprovou o formato do Breno), só re-tipografa e reduz densidade.
- **Fluxo diário**: revalida sticky header e destaque do dia (já funciona, só troca cores).
- **Gastos**: já refeito recentemente, só ajusta paleta.
- **Parcelas / Desejos / Investimentos / Tarefas**: aplica DataView + tipografia nova, revisa empty states.
- **Config**: agrupa em seções com dividers hair.
- **Onboarding**: reescreve com o novo tom editorial.
- **Auth**: hero à esquerda + form à direita, split premium.

## 6. Backend / infra

- Nova tabela `waitlist(email, created_at)` com RLS `INSERT anon`, `SELECT service_role`. Migration + grants.
- Nada além disso (sem mexer em lógica financeira).

## 7. QA ponta-a-ponta (Playwright, headless, 1280×1800)

Script único em `/tmp/browser/qa/run.py` que:
1. Loga com a conta `ericktorresadm@hotmail.com`.
2. Visita cada rota: `/`, `/auth`, `/onboarding`, `/app`, `/app/fluxo`, `/app/gastos`, `/app/parcelas`, `/app/desejos`, `/app/investimentos`, `/app/tarefas`, `/app/config`.
3. Em cada uma: screenshot + verifica ausência de erros no console + testa 1 interação real (ex.: preencher célula no fluxo, adicionar gasto, alternar view Card/Tabela).
4. Salva screenshots em `/tmp/browser/qa/shots/` e printa relatório.

Só declaro "pronto pra vender" após todos os passos passarem visualmente.

---

## Detalhes técnicos

- Instalo: `motion` (motion/react v11) e `@number-flow/react` (animação de números na LP).
- Fontes via `<link>` no `__root.tsx` (Fraunces + Geist).
- LP usa `og:image` absoluto com screenshot do hero (gerado via product-shot skill).
- SEO: `head()` único em `/` com title "meudindin — planejamento financeiro simples", description, og completo.
- Rota `/app` protegida (reativo `_authenticated` layout já existente).
- Sem mudança em `finance.ts`, `db.ts`, RLS existente, tipos gerados.

## Arquivos

**Criar**: `src/routes/index.tsx` (LP), `src/components/landing/*` (Nav, Hero, Compare, Features, Steps, Screens, Pricing, Faq, Cta, Footer), `src/components/Logo.tsx`, `src/assets/logo.svg`, `public/favicon.png`, migration `waitlist`, `/tmp/browser/qa/run.py`.

**Editar**: `src/styles.css`, `src/routes/__root.tsx`, todos `src/routes/_authenticated/*`, `src/routes/auth.tsx`, `src/routes/onboarding.tsx`, `src/components/AppShell.tsx`.

**Mover**: rotas atuais de `_authenticated/` para `_app/_authenticated/` (ou renomeio para liberar `/`).

Quando aprovar, começo pela pesquisa + verificação do domínio, aí sigo em ordem.
