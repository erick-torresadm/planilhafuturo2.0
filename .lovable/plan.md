# Redesign completo — SaaS financeiro mobile-first

Prioridade absoluta: **80% mobile**. Toda tela é desenhada primeiro para 375px de largura e depois escala pra desktop.

## 1. Design system (src/styles.css)

Substituir tokens atuais pelo tema **Neon Mint dark** (com modo claro como opção secundária):

- `--background: #0d1b2a` (azul-marinho profundo)
- `--card: #12253a` (superfície elevada)
- `--card-elevated: #17304a`
- `--foreground: #e6f4ef`
- `--muted: #1b4332` (verde escuro sutil)
- `--muted-foreground: #94a8a0`
- `--primary: #2dd4a8` (mint) / `--primary-foreground: #0d1b2a`
- `--accent: #73ffb8` (neon glow, só para destaques/hover)
- `--positive: #2dd4a8`, `--negative: #ff6b6b`, `--warning: #fbbf24`
- `--border: rgba(115,255,184,0.08)` (bordas quase invisíveis, glow sutil)
- Sombras com glow verde: `--shadow-glow: 0 0 24px rgba(45,212,168,0.15)`

Tipografia via `<link>` no `__root.tsx` (Google Fonts — Sora 400/600/700 + Manrope 400/500/600/700). `--font-heading: "Sora"`, `--font-sans: "Manrope"`. `tabular-nums` em toda cifra. Radius base 14px (arredondado moderno, não brutalist).

Atualizar `sheet-th/sheet-td/sheet-row-alt` para tema dark: header com gradiente mint sutil, linhas alternadas com `bg-card-elevated`, célula focada com ring mint neon.

## 2. Shell mobile-first (novo AppShell)

Reescrever `src/components/AppShell.tsx` usando shadcn `Sidebar` com `collapsible="offcanvas"`:

- **Mobile (<768px)**: topbar fixa (56px) com logo + nome da tela + `SidebarTrigger` (hambúrguer). Sidebar desliza da esquerda como overlay. Bottom safe-area padding.
- **Desktop (≥768px)**: sidebar fixa 240px à esquerda, sempre visível, com opção de recolher para ícones.
- Sidebar: logo "💰 Planilha", nome do usuário + avatar, itens (Dashboard, Fluxo Diário, Gastos Fixos, Parcelas, Desejos, Investimentos, Tarefas, Config), badge de saldo atual no rodapé, botão Sair.
- Item ativo com borda-esquerda mint + fundo `bg-primary/10` + texto mint.

## 3. Componente novo: `<DataView>` (toggle Card/Tabela)

Componente reutilizável que envolve dados tabulares:
- Header com título + botões pill `[Cards | Tabela]` (padrão Cards no mobile, Tabela no desktop, preferência salva em localStorage).
- Modo **Tabela**: mantém `sheet-grid` com scroll horizontal + **primeira coluna sticky** (`sticky left-0 bg-card z-10`).
- Modo **Cards**: renderiza via prop `renderCard(row)` — cada card em `bg-card rounded-2xl p-4` com hierarquia clara (título grande, cifra em destaque, meta em muted).

Usado em: Gastos Fixos, Parcelas, Desejos, Investimentos, Tarefas.

## 4. Redesign por tela (mobile-first)

### Dashboard (`_authenticated/index.tsx`)
- **Hero stat card**: saldo atual gigante (`text-5xl font-heading tabular-nums`), delta do mês com seta ↑↓ colorida, mini-sparkline dos 6 meses (SVG inline).
- Grid 2×2 de KPI cards: Entradas mês, Saídas mês, Reserva (%), Investimentos.
- Card "Meu dinheiro está onde?" — barra empilhada horizontal (Conta / Investimentos / Caixinhas) + legenda.
- Card "Próximos 6 meses" — no mobile vira lista scrollável horizontal de month-cards (snap-x, cada card = 1 mês com sobra + acumulado + badge status). No desktop mantém tabela.
- Card "Reserva de emergência" — progress bar grossa mint com % centralizado.
- Ordem otimizada mobile: saldo → sparkline → reserva → 6 meses → onde está → KPIs.

### Fluxo Diário (`fluxo.tsx`)
- Toolbar sticky no topo: seletor mês (chevron ← Nov ▼ →), botão "Hoje", toggle Card/Tabela.
- **Cards (default mobile)**: um card por dia com data grande à esquerda + entradas/saídas empilhadas + saldo do dia em destaque à direita (verde/vermelho). Dias sem lançamentos colapsados numa linha "5 dias sem movimento".
- **Tabela (desktop)**: mantém grid dos 6 meses com scroll horizontal, primeira coluna (data) sticky, células com foco neon ring, navegação Tab/Enter preservada.
- FAB (`fixed bottom-20 right-4`) "+ Lançamento" abre bottom-sheet com data/descrição/valor/tipo.

### Gastos Fixos (`gastos.tsx`)
- **Cards**: cada gasto = card com ícone da categoria + descrição + dia do mês (pill) + valor grande à direita + switch ativo/inativo.
- Agrupamento por categoria (accordion collapsible).
- Total no header sticky: "Total mensal: R$ X.XXX".
- Botão flutuante "+ Novo gasto".

### Parcelas (`parcelas.tsx`)
- **Cards**: descrição + progress bar (parcela atual/total) + valor mensal + meses restantes + data fim.
- Header: total mensal em parcelas + total quitando (soma restante).
- Import CSV mantém como botão secundário no header.

### Desejos (`desejos.tsx`)
- Cards de desejo com status badge colorido (verde "PODE COMPRAR", âmbar "X meses para guardar", vermelho "REVER").
- Seção Caixinhas separada com cards grandes (emoji + nome + progress circular ou linear com %).

### Investimentos (`investimentos.tsx`)
- Hero card com Posição Total + Rendimento total (% e R$).
- Card animado "Rendeu hoje: R$ X" com glow mint pulsante.
- Cards de posição por ativo (nome, tipo, aplicado, atual, rendimento %).

### Tarefas (`tarefas.tsx`)
- Filtro pills sticky. Cards com checkbox à esquerda + descrição + data/valor. Atrasadas com borda vermelha à esquerda.

### Config (`config.tsx`)
- Seções agrupadas (Perfil, Dinheiro, Sons, Conta) com labels acima e helper text abaixo. Cards separados, respirando.

### Auth (`auth.tsx`) e Onboarding
- Redesign com hero mint, logo, cards escuros, botões mint com glow no hover. Onboarding progress-bar mint, botões grandes tocáveis (min h-12).

## 5. Interações e polimento

- Toda ação de sucesso: micro-animação (scale + glow mint 200ms) + som existente.
- Botões: `min-h-11` no mobile (touch target 44px+), `active:scale-[0.98]`.
- Inputs de célula: focus com `ring-2 ring-primary/40` + glow.
- Skeletons animados enquanto carrega (não spinner genérico).
- Transições de rota: fade curto (150ms).

## Detalhes técnicos

- Fontes: adicionar `<link>` Sora+Manrope no `__root.tsx` `head.links`.
- Sidebar shadcn: usar `collapsible="offcanvas"` (mobile fecha completo) — no desktop usar variante `collapsible="icon"` opcional. Wrapper `SidebarProvider` com `w-full` e `min-h-svh`.
- Ao usar CSS vars em widths: usar `w-[var(--sidebar-width)]` (nunca `w-[--sidebar-width]`).
- `DataView`: hook `useViewMode(key)` com localStorage, default `"cards"` se `window.innerWidth < 768`.
- Cifras: componente `<Money value={n} />` com `tabular-nums` e cor semântica automática (verde/vermelho/neutro).
- Sparkline: SVG polyline puro (sem lib) baseado nos 6 saldos.
- Bottom-sheet: usar `Sheet` do shadcn com `side="bottom"`.
- FAB não sobrepor bottom-safe-area em iOS: `bottom-[calc(1rem+env(safe-area-inset-bottom))]`.
- Manter toda lógica atual de `useSounds`, `finance.ts`, `db.ts`, RLS, rotas — só UI muda.
- Preservar navegação Tab/Enter/setas no `SheetCell` no modo Tabela.

## Arquivos

**Editar**: `src/styles.css`, `src/routes/__root.tsx`, `src/components/AppShell.tsx`, `src/components/SheetCell.tsx`, todas as rotas em `src/routes/_authenticated/*.tsx`, `src/routes/auth.tsx`, `src/routes/onboarding.tsx`.

**Criar**: `src/components/DataView.tsx`, `src/components/Money.tsx`, `src/components/Sparkline.tsx`, `src/components/MonthCard.tsx`, `src/components/StatCard.tsx`, `src/components/EmptyState.tsx`, `src/hooks/useViewMode.ts`.

Sem mudanças de schema, backend ou lógica financeira — puramente UI/UX.
