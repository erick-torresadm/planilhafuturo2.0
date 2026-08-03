# Design: Plano grátis condicionado ao saldo + Página "Obrigado" com upsell de mentoria

Data: 2026-08-03
Status: Aprovado pelo usuário

## Objetivo

Tornar a barreira de entrada fácil e transparente: o usuário usa o app **grátis, com tudo liberado, enquanto estiver no vermelho**. Ao ficar positivo, ele ganha 7 dias para pagar. Depois de pagar, vira assinatura normal — mesmo se cair no vermelho, continua pagando (o grátis no vermelho é só a barreira de entrada, não um benefício vitalício). Adicionar página de "Obrigado" pós-pagamento com upsell da mentoria do dono.

## Decisões confirmadas

| Ponto | Decisão |
|---|---|
| Escopo do grátis | Tudo liberado, sem trial por tempo |
| Quando fica "positivo" | Sobra do mês ≥ R$250 **OU** patrimônio investido ≥ R$3.000 (mês fechado) |
| Após ficar positivo | 7 dias de graça para pagar |
| Prazo vs. voltar ao vermelho | Prazo de 7 dias segue mesmo se cair no vermelho (não pode fugir) |
| Não pagou em 7 dias | Paywall (trava até pagar) |
| Após pagar | Assinatura normal; se ficar no vermelho depois, continua pagando (não volta ao grátis) |
| Transparência | Seção na landing explicando que o grátis é até ficar positivo |
| Investimento conta | Patrimônio investido (posicao_atual somado) ≥ R$3.000 |
| Página pós-pagamento | /obrigado com upsell da mentoria |
| Mentoria | Checkout com Pix/cartão, R$497 |
| Após pagar mentoria | WhatsApp 11 94833-3534 com mensagem pré-preenchida |
| Substitui | Trial fixo de 15 dias atual |

## Arquitetura

### 1. Status de assinatura com gate por saldo (server-side)

Em `src/lib/assinatura.functions.ts`, `getSubscriptionStatus` passa a retornar um status novo que reflete o gate por saldo, não só trial fixo:

- Calcula "positivo" no servidor (service role):
  - Sobra do mês: entradas − saídas do mês corrente (dados de `lancamentos` + `gastos_fixos` + `parcelas` do mês). Se `>= 250`, positivo.
  - Patrimônio investido: `sum(posicao_atual)` em `investimentos`. Se `>= 3000`, positivo.
  - Mês fechado = só considera meses completos? Decisão de implementação: considerar o mês corrente (simples e alinhado ao "1 mês apenas" escolhido). Na prática, a sobra é projetada para o mês atual.
- Se já pagou (assinatura ativa): `status: "ativo"` — não volta ao grátis mesmo se o saldo cair.
- Se ainda não pagou:
  - Não positivo → `status: "grátis"` (tudo liberado).
  - Positivo → inicia contagem de 7 dias; se `now - dataPositivo <= 7d` → `status: "graça"` (ainda liberado); se passou 7d → `status: "inativo"` (paywall).
- Precisa persistir "quando ficou positivo" — nova coluna em `profiles` (ex.: `positivo_em timestamptz`) gravada via service role quando o gate detecta positivo pela primeira vez. Isso evita recalcular e dar "fuga" a cada request.
- Workspace-aware: quando `forOwner` é usado (ADM vendo workspace do dono), o gate usa os DADOS do dono — coerente com o que já existe.

### 2. Transparência na landing

Nova seção em `src/routes/index.tsx` (perto de Pricing):
- Texto: "Grátis enquanto você estiver no vermelho. Quando seu mês ficar positivo, é hora de apoiar o projeto."
- Ajustar a copy do trial (remover "7 dias" como trial fixo; ou manter "comece grátis, sem cartão").

### 3. Página /obrigado com upsell de mentoria

- Nova rota `src/routes/obrigado.tsx` (pública, mas mostra o que acabou de ativar).
- O checkout e a ativação redirecionam para `/obrigado` após pagamento confirmado:
  - `checkout.tsx` (pré-cadastro): após `verifyPreSignupPayment` ok → redireciona.
  - `config.tsx` (pós-login): após `verifyPayment` ok → redireciona.
  - `auth.tsx`: após ativação pós-signup → redireciona.
- Conteúdo: confirmação + plano ativado.
- Upsell: bloco "Quer atenção especial do dono da ferramenta?" → botão "Mentoria com Erick — R$497" → `checkout?plan=mentoria`.
- Após pagar a mentoria → WhatsApp 11 94833-3534 com mensagem pré-preenchida.

### 4. Checkout da mentoria

- Adicionar `mentoria: { nome: "Mentoria com Erick", valor: 497, dias: 0 }` no mapa `PLANOS` de `assinatura.functions.ts`.
- O checkout pré-cadastro (`createPreSignupCheckout`) e pós-login (`createCheckoutSession`) já são genéricos por plano — o `plan=mentoria` flui pelo mesmo caminho.
- `activatePlanPostSignup` precisa tratar `mentoria`: registrar a compra e marcar `compras_avulsas` (item `mentoria`), NÃO criar assinatura do app (mentoria é produto separado, como a planilha).
- Após ativar mentoria → redireciona para WhatsApp 11 94833-3534 com texto pré-preenchido.

### 5. Validação do gate (cálculo de sobra do mês)

- Reutilizar a lógica de fluxo existente (a mesma que o app usa em `app.tsx`/`fluxo`), mas calculada no servidor a partir dos dados reais.
- **Decisão explícita:** o gate usa APENAS movimentações reais do mês (`lancamentos` + `gastos_fixos` + `parcelas`), NÃO usa `profiles.saldo_inicial` — porque o usuário pode editar a própria linha de profile (RLS user_owns) e inflar o saldo inicial para escapar do gate. Sobra do mês = entradas reais − saídas reais do mês.

## Segurança

- O gate é calculado **server-side** (service role) — não dá pra burlar pelo client.
- Persistir `positivo_em` via service role; usuário não edita.
- Sem vazamento: o gate usa dados do próprio usuário (ou do workspace se forOwner).

## Fora de escopo (YAGNI)

- Nenhuma distinção de "recursos premium" no grátis — tudo é liberado.
- Sem checkout de mentoria recorrente — compra única.
- Sem e-mail automático lembrando do prazo (por ora; o app mostra banner).

## Riscos

- Usuário que nunca fica positivo fica grátis para sempre → aceito pelo usuário (barreira de entrada).
- Um mês anormal (bônus/13º) dispara o gate → aceito (1 mês apenas); o prazo segue mesmo se cair no vermelho.
- Saldo inicial editável pode permitir "manipular" o gate → mitigar usando apenas movimentações reais no cálculo server-side.
