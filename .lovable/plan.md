
# V2 — Redesign Completo

Nova identidade baseada nos tokens que você passou: verde-menta vibrante (#51f0a8) como primário sobre off-white quase puro, cantos generosos (1.4rem), sombras suaves, tipografia Plus Jakarta Sans + Lora (destaques editoriais) + IBM Plex Mono (números/planilha). Suporte a dark mode nativo desde o início.

## 1. Fundação de design (`src/styles.css`)

Substituir o tema "Emerald Prestige" atual pelo seu:

- Tokens `:root` e `.dark` copiados literalmente do CSS enviado, adaptados ao `@theme inline` do Tailwind v4 (mapear cada `--*` para `--color-*`).
- Radius base `1.4rem` → utilidades `rounded-lg/xl/2xl` ficam com pill/soft-square.
- Sombras: sistema `--shadow-*` do seu preset (blur 3px, offset-y 1px, opacity 0.1) traduzido para `--shadow-card` / `--shadow-hero` mais suaves.
- Fontes carregadas via `<link>` no `__root.tsx` (Google Fonts: Plus Jakarta Sans, Lora, IBM Plex Mono) — nunca `@import` de URL.
- Manter tokens semânticos existentes (`--positive`, `--negative`, cell states) mas realinhados à nova paleta (positive = primary mint, negative = destructive rosa/vermelho `#f54a88`).
- Toggle de dark mode global (persistido em localStorage, classe `.dark` no `<html>`).

## 2. Componentes base (shadcn refinados)

- `Button`, `Card`, `Input`, `Dialog`, `Badge`, `Tabs` reajustados para o novo radius e sombra.
- Nova variante `Button variant="mint"` (primário sólido preto sobre mint) e `variant="ghost-mint"`.
- `Card` ganha borda `--border` quase invisível + sombra hairline (Tailgrids style).
- Nova primitiva `Section` (spacing consistente vertical), `Eyebrow` (label monospace uppercase), `Stat` (número Lora + label Jakarta).

## 3. Landing Page V2 (`/` e `/pv2`)

Inspiração Tailgrids — blocos densos, tipografia grande, muito respiro, ícones lineares.

- **Hero**: split assimétrico. Esquerda: eyebrow monospace, H1 Lora display 72px, subtítulo Jakarta, dupla CTA (mint sólido + ghost). Direita: mockup da planilha em card flutuante com sombra suave e chip "hoje" destacado.
- **Faixa de logos/prova social** com marquee suave.
- **Features bento** (6 cards, alturas variadas) com ícones lineares + microdemo animado (motion/react) em cada.
- **Como funciona** — 3 steps numerados grandes, layout zigzag.
- **Metodologia E-S-D-E-C** em cards horizontais coloridos com o mint.
- **Comparativo antes/depois** repaginado (tabela limpa em vez de blocos).
- **Depoimentos** em masonry (3 colunas desktop, 1 mobile) estilo WhatsApp cards com nova moldura.
- **Pricing V2** — 2 cards (Anual R$300 / Vitalício R$800) lado a lado, Vitalício com fita "Fundador", destaque forte no "Suporte em call com erick" (badge mint pulsante).
- **FAQ** com accordion shadcn refinado.
- **Footer** editorial com wordmark grande em Lora.
- `/pv2` mantém elementos VSL (vídeo, urgência, floating WhatsApp) mas com o novo visual.

## 4. App interno (todas rotas `_authenticated/*`)

Sensação "planilha premium" — clean, com detalhes mint só onde importa.

- **AppShell**: sidebar desktop com fundo `--sidebar` branco puro, item ativo com pill `--sidebar-accent` (verde clarinho) + barra lateral mint. Bottom nav mobile com indicador mint arredondado e ícones outline mais finos. Toggle de tema no rodapé da sidebar.
- **Topbar**: breadcrumb + busca global (⌘K placeholder) + avatar + notificações.
- **Dashboard `/app`**: hero card com saldo projetado grande em Lora, delta em mint/rosa. Grid bento: Pilares (E-S-D-E-C) como cards individuais com anel de progresso, Reserva de emergência com barra, Fluxo dos próximos 7 dias mini-gráfico, Próximas parcelas, Tarefas do dia.
- **Fluxo diário `/fluxo`**: mantém a tabela planilha (essência do produto) mas com cabeçalho novo, linha "hoje" com fundo `--sidebar-accent` + borda mint espessa à esquerda, números em IBM Plex Mono, chips E/S/D com cores da nova paleta. Navegação de meses vira segmented control no topo.
- **Gastos / Parcelas / Investimentos / Desejos / Tarefas**: mesma estrutura visual — header padrão com título Lora + CTA mint, DataView (cards/tabela) com novos estilos, dialogs de criação refinados.
- **Produtividade `/produtividade`**: timer Pomodoro com círculo mint, hábitos em grid semanal com preenchimento suave.
- **Auth `/auth`**: split 50/50, esquerda formulário limpo, direita ilustração/quote editorial em fundo mint claro.
- **Onboarding / Docs**: harmonizados ao novo visual.

## 5. Motion & microinterações

- Fade-up padrão em seções (motion/react com viewport once).
- Hover em cards: leve `translate-y-[-2px]` + sombra intensifica.
- Botão mint com press state (scale 0.98).
- Números do dashboard animam de 0 até o valor (count-up) na primeira renderização.

## 6. Entregáveis técnicos

- `src/styles.css` reescrito.
- `src/routes/__root.tsx` — links das fontes + classe dark.
- Novo `src/components/ThemeToggle.tsx`.
- Refactor de `AppShell.tsx`, todos os arquivos em `src/routes/` (LP + app).
- Ajustes pontuais em `Money.tsx`, `SheetCell.tsx`, `DataView.tsx` para novos tokens.
- Sem mudança de lógica de negócio, sem mudança de schema, sem mudança em `src/lib/finance.ts` ou nas queries.

## Ordem de execução

1. Tema + fontes + dark toggle
2. Componentes base shadcn ajustados
3. AppShell + Dashboard + Fluxo (o coração do produto)
4. Demais rotas do app
5. Landing `/` V2
6. `/pv2` V2
7. Auth / Onboarding / Docs
8. Passada de QA responsivo (mobile-first, 375/768/1280)

Depois de aprovado eu executo tudo em sequência — nada de lógica de negócio muda, só apresentação.
