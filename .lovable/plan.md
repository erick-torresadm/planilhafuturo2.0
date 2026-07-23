
# Planejamento Financeiro estilo "Planilha do Erick"

## Objetivo
App web com **cara de planilha** (grade densa, edição inline, navegação por teclado tipo Excel), replicando fielmente a lógica das planilhas anexadas. O foco é **visualização do futuro do dinheiro** — 6 meses à frente com saldo projetado dia a dia.

## Análise das planilhas anexadas
Inspecionei os dois arquivos. As abas confirmam quase 1:1 o que você descreveu:
- **Tabela_gastos** — Cat, Desc, Valor, Tipo (P/A/C), Freq (Mensal/Anual), Dia, Forma, Ativo. Sua Fase 2 bate, mas faltou **Freq (Mensal/Anual)** e **Parc (ex "3/24", "10/10")** que existem na planilha — importante para gastos anuais como IPTU/Claude AI não estourarem todo mês no fluxo diário.
- **V.GERAL PRIMEIRO/SEGUNDO SEMESTRE** — grade de 6 meses lado a lado, colunas Entradas Fixas | Entrada Diária | Saídas Fixas | Saída Diária | Saldo. Bate com Fase 3.
- **Parcelas** — Data, Descrição, Valor Total, Qtd, Parcela, Cartão, Categoria, Nota, Restantes, Até, + colunas mensais (JUL…DEZ). Bate com Fase 4. Nota: a planilha usa formato "7/12" (parcela atual/total) — precisamos guardar `parcela_atual` além de `qtd_parcelas` pra calcular "Restantes" e "Até".
- **Fila de Desejos** — bate com Fase 6, incluindo "Sobra mensal estimada" no topo.
- **Investimentos** — Data, Nome, Tipo, Renda, Valor Aplicado, Posição Atual, Renda Mensal, Vencimento. Bate com Fase 8.
- **DASHBOARD** e **RECOMENDADO** existem mas quase vazias — vamos usar sua especificação da Fase 5.

## Ajustes que proponho (baseados na planilha real)
1. **gastos_fixos** ganha `frequencia` (`mensal`|`anual`) e `parcela_atual`/`parcela_total` (pra tipo C). Gasto anual só entra na Saída Fixa do dia certo **uma vez por ano**, não todo mês.
2. **parcelas** ganha `parcela_inicial` (ex já pagou 6 de 12, começa em 7) — a planilha rastreia isso.
3. **Fluxo Diário**: janela de 6 meses configurável, mês atual sempre à esquerda. Saldo do dia 31 do mês anterior alimenta o próximo. Saídas Fixas do dia = soma de gastos_fixos ativos com `dia = D` respeitando frequência + soma das parcelas ativas cujo dia bate.
4. **Dashboard** com clique no mês → navega pro Fluxo Diário focado nele.
5. **Estilo planilha**: grade densa (linhas ~28px), fonte tabular (Inter tabular-nums), edição inline com Tab/Enter/Setas/F2/Esc, autosave debounced, undo local (Ctrl+Z).

## Ordem de execução (mesma que você propôs)
Vou seguir suas 10 fases exatamente na ordem. Cada fase = um deliverable testável antes de seguir.

| Fase | Entrega |
|---|---|
| 1 | Enable Lovable Cloud + schema (9 tabelas) + RLS + trigger de profile + seed |
| 2 | Tela **Gastos Fixos** (com Freq + Parc) |
| 3 | Tela **Fluxo Diário** (6 meses, saldo projetado, teclado tipo Excel) |
| 4 | Tela **Parcelas** (+ importação CSV Nubank/XP) |
| 5 | **Dashboard** anual + reserva de emergência + "onde está meu dinheiro" |
| 6 | **Fila de Desejos** + Caixinhas |
| 7 | Sons Web Audio + configurações |
| 8 | **Investimentos** + rendimento diário CDI |
| 9 | Tarefas + Lembretes (automáticos e manuais) |
| 10 | Onboarding 5 telas (nome, renda, gastos pré-preenchidos, importar CSV, pronto) |

## Decisões técnicas (o que vou usar por padrão)
- **Backend**: Lovable Cloud (Supabase gerenciado) — banco, auth email/senha + Google, RLS por `auth.uid()`.
- **Stack**: TanStack Start (React 19 + Vite) já pronto no template, Tailwind v4, shadcn/ui, TanStack Query, TanStack Table para as grades.
- **Design system**: paleta da planilha (azul escuro #0D47A1 header, verde #2E7D32 positivo, vermelho #C62828 negativo, linhas alternadas), tokens semânticos em `src/styles.css` (nada de cor hardcoded nos componentes). Fonte Inter com `font-variant-numeric: tabular-nums`.
- **Trial/pagamento**: campos `plano`, `trial_started_at`, `trial_ends_at` ficam no schema desde a Fase 1, **mas a integração Stripe não entra agora** — só quando você pedir. Assinaturas ficam como tabela vazia até lá.

## Perguntas antes de começar a Fase 1
Preciso confirmar 3 coisas rápidas antes de gerar o banco (evita retrabalho):

1. **Login**: só email/senha, ou também Google? (padrão que sugiro: email/senha + Google)
2. **Multiusuário**: cada pessoa vê só o dela (padrão), ou você quer compartilhar planilha entre casal/família já na v1?
3. **Moeda/local**: fixo BRL/pt-BR, ou preparar pra i18n depois?

Se responder "padrão em tudo" eu já toco a Fase 1 completa (schema + RLS + seed) no próximo turno.

## Detalhes técnicos (referência)

**Cálculo da Saída Fixa do dia D no mês M/A:**
```
saida_fixa(D, M, A) =
   Σ gastos_fixos.valor WHERE ativo=true AND dia=D
     AND (frequencia='mensal' OR (frequencia='anual' AND mes_cadastro=M))
 + Σ parcelas.valor_parcela WHERE dia_compra=D
     AND M/A entre mes_inicio e mes_inicio + qtd_parcelas - parcela_inicial
```

**Saldo dia D:** `saldo(D-1) + entradas_fixas + entrada_diaria - saida_fixa - saida_diaria`, com `saldo(dia 0 do mês M)` = último saldo do mês M-1, e mês inicial = `profiles.saldo_inicial` (novo campo que vou adicionar).

**Tabelas com pequenos ajustes vs seu prompt:**
- `profiles`: + `saldo_inicial DECIMAL DEFAULT 0`
- `gastos_fixos`: + `frequencia TEXT DEFAULT 'mensal'`, + `parcela_atual INT`, + `parcela_total INT`
- `parcelas`: + `parcela_inicial INT DEFAULT 1` (pra quem já pagou algumas)
- Índices: `(user_id, dia)` em gastos_fixos, `(user_id, data)` em lancamentos e parcelas.

Todas as tabelas em `public` recebem `GRANT` explícito pra `authenticated`/`service_role` no mesmo migration (regra do Data API).
