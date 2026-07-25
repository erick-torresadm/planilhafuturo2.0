# Redesign do app — Hope UI + Planilha

## Escopo
- **Manter**: Landing (`/`, `/pv2`, `/docs`, `/termos`, `/privacidade`, `/cookies`), banco Supabase, `src/lib/finance.ts`, `src/lib/demoData.ts`, `src/lib/db.ts`, `src/lib/format.ts`, auth (`/auth`, `_authenticated/route.tsx`), hooks (`useSounds`, `useAuth`), chatbot.
- **Refazer do zero**: `AppShell`, todas as rotas em `src/routes/_authenticated/*`, componentes de UI internos (`MoneyInput`, `SheetCell`, `Money`, `DataView`), tokens de design em `src/styles.css`.

## Direção visual (Hope UI clássico)

Referência: iqonicdesignofficial/hope-ui-design-system — sidebar branca, topbar limpo, cards com sombra suave, azul primário + verde sucesso.

### Tokens (`src/styles.css`)
- Fundo app: `#f5f7fb` (cinza-azulado bem claro)
- Sidebar/cards: `#ffffff` com `shadow: 0 4px 24px rgba(15,23,42,0.06)`
- Bordas: `#e6eaf2`
- Primário: `#3a57e8` (azul Hope) + hover `#2f47c4`
- Sucesso/positivo: `#1aa053`
- Aviso: `#f16a1b`
- Negativo: `#c03221`
- Texto: `#232d42` / muted `#8a92a6`
- Radius padrão: `10px` (cards `16px`)
- Sombra hover suave, transições 150ms

### Tipografia
- Headings: **JetBrains Mono** (peso 600/700) — cara de planilha/terminal
- Body/UI: **Work Sans** (400/500/600)
- Números financeiros: `font-variant-numeric: tabular-nums` sempre
- Carregadas via `<link>` em `__root.tsx`

### Densidade
- App shell e dashboard: **espaçada moderna** (padding 24-32px, cards altos)
- Planilha (`/fluxo`, `/gastos`, `/parcelas`): mantém `sheet-grid` denso para caber o mês inteiro

## AppShell novo

```
┌─────────────────────────────────────────────────┐
│ [sidebar 240px]  [topbar h-64px                ]│
│  Logo             busca · notif · avatar        │
│  ─────────       ───────────────────────────────│
│  Dashboard      │                               │
│  Fluxo          │      <Outlet /> em            │
│  Gastos         │      container max-w-7xl      │
│  Parcelas       │      com padding 32px         │
│  Investimentos  │                               │
│  Tarefas        │                               │
│  Foco           │                               │
│  Desejos        │                               │
│  ─────────      │                               │
│  Config         │                               │
└─────────────────────────────────────────────────┘
```

- **Desktop (≥1024px)**: sidebar fixa branca 240px com ícone + label, item ativo com fundo `primary/10` e barra lateral azul de 3px. Topbar com busca global (placeholder), sino, avatar dropdown.
- **Tablet (768-1023px)**: sidebar colapsa para 72px (só ícones), tooltip no hover.
- **Mobile (<768px)**: sidebar vira drawer (Sheet do shadcn), topbar mostra hambúrguer + logo + avatar. Bottom nav removido — mais cara de sistema, menos de app. 5 links principais no drawer.

## Telas

### `/app` (Dashboard)
Grid 12 colunas, estilo Hope:
- **KPIs (4 cards)**: Renda, Fixos, Sobra, Reserva. Cada card: label pequeno em cima, número grande mono, delta % em relação ao mês anterior.
- **Gráfico principal (col-span-8)**: Projeção de saldo 6 meses (linha, Recharts) com área preenchida em azul translúcido.
- **Pilares (col-span-4)**: barras stacked Sobrevivência/Proteção/Liberdade com % da renda.
- **Cálculos do mês (col-span-6)**: fórmula E-S-D-E-C atual em linha, com badges coloridos redondos.
- **Próximas parcelas (col-span-6)**: lista das 5 próximas com valor e mês final.

### `/fluxo` (Fluxo Diário)
- Header sticky: seletor de mês (setas ← →), toggle 6 meses, botão "hoje".
- Tabela real com bordas de grade sutis (`#e6eaf2`), cabeçalho sticky com fundo `#f5f7fb`.
- Colunas: Dia | Entrada | Saída | Saldo | Nota
- Linha do dia atual: fundo `primary/5`, borda esquerda azul 3px, altura 56px (resto 40px).
- Cell editing: click abre input com anel azul, Enter commita, Tab avança.
- Rodapé sticky: total do mês, saldo final projetado.
- Mobile: mesma tabela, colunas Entrada/Saída/Saldo com fonte 12px mono; dia atual expande para 72px.

### `/gastos` (Gastos Fixos)
- Toolbar: busca, filtro por categoria, botão "+ Novo gasto" (abre `NewGastoDialog`).
- Tabela com colunas: Categoria (badge colorido) | Descrição | Valor (mono, right) | Dia venc. | Ações.
- Linhas hover destacam, editáveis inline em Descrição/Valor.
- Rodapé: Total fixos + % da renda.

### `/parcelas`
- Timeline horizontal + tabela abaixo.
- Colunas: Item | Total | Parcelas | Início | Fim | Valor/mês | Ações.
- Import CSV mantém funcionalidade atual.

### `/investimentos`
- Cards por tipo (Renda Fixa / Ações / FIIs / Cripto) com totais.
- Tabela abaixo com aportes.

### `/tarefas`
- Kanban 3 colunas (A fazer / Fazendo / Feito) com cards brancos + drag.
- Ou lista simples com checkbox se preferir — vou pela lista pra ficar consistente.

### `/produtividade` (Foco)
- Pomodoro central grande + hábitos do dia em grid.
- Bloqueado para plano free (badge "Pro").

### `/desejos`
- Grid de cards (wishlist) + Caixinhas com barras de progresso azuis.

### `/config`
- Formulário limpo em seções: Perfil / Financeiro / Sons / Conta.

## Componentes internos refeitos

- `AppShell.tsx` — sidebar + topbar novos.
- `MoneyInput.tsx` — prefixo `R$` cinza, borda `#e6eaf2`, focus ring azul 2px.
- `SheetCell.tsx` — sem `bg-cell-edit` verde, usar `bg-primary/5` no hover e `ring-primary` no edit.
- `Money.tsx` — mantém API, cores: positivo `#1aa053`, negativo `#c03221`.
- `KpiCard.tsx` (novo) — card branco, label mono minúsculo, número grande, delta.
- `PageHeader.tsx` (novo) — título + subtítulo + ações à direita, padrão em todas as páginas.
- `DataTable.tsx` (novo) — wrapper de tabela com estilos Hope (header cinza claro, borda sutil, hover).

## Etapas de execução

1. **Tokens + fontes**: reescrever `src/styles.css` (Hope palette + JetBrains/Work Sans), atualizar `<link>` em `__root.tsx`.
2. **AppShell + PageHeader + DataTable**: rebuild `AppShell.tsx`, criar helpers.
3. **Componentes de célula**: `MoneyInput`, `SheetCell`, `Money`, `KpiCard`.
4. **Dashboard `/app`**: novo layout 12-col com Recharts.
5. **`/fluxo`**: tabela sticky com dia atual destacado.
6. **`/gastos`, `/parcelas`, `/investimentos`**: tabelas padrão.
7. **`/tarefas`, `/produtividade`, `/desejos`**: layouts próprios seguindo padrão.
8. **`/config`**: formulário limpo.
9. **QA responsivo**: testar 393px, 768px, 1280px com Playwright.

## Fora do escopo (não muda)
- Landing, LP v2, docs, termos, cookies, chatbot.
- Schema do banco, RLS, migrations.
- `finance.ts`, `demoData.ts`, `db.ts`.
- Fluxo de auth e OAuth.
- `useSounds`.
