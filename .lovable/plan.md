## Objetivo

Reduzir barreira de entrada trocando o plano gratuito por um Anual Starter (R$69,90 com só 1 mês de projeção) e adicionar a venda da planilha original por R$129,90 na landing.

## 1. Reestruturação dos planos

Substituir a estrutura atual (Anual R$300 / Vitalício R$800) por **três tiers**:

| Tier | Preço | O que libera |
|---|---|---|
| **Starter** | R$69,90/ano | Fluxo diário limitado a **1 mês** de projeção · Gastos fixos · Parcelas · Dashboard básico. Sem Produtividade, sem Investimentos avançados, sem Desejos, sem suporte em call. |
| **Anual** | R$300/ano | Tudo · 6 meses · Suporte em call com erick |
| **Vitalício** | R$800 uma vez | Tudo · para sempre · Suporte em call com erick · fita "Fundador" |

- Copy do Starter enfatiza "comece por menos de R$6/mês, veja seu próximo mês inteiro".
- Anual continua como plano recomendado (badge "Mais escolhido").
- Vitalício mantém destaque "Fundador".

Arquivos: `src/routes/index.tsx` (seção pricing) e `src/routes/pv2.tsx` (stack de oferta) — só apresentação, sem lógica de billing ainda.

## 2. Seção "Prefere a planilha?"

Novo bloco na landing (`/` e `/pv2`), logo abaixo do pricing:

- Layout split: à esquerda copy editorial ("Prefere planilha? A original que deu origem ao app."), à direita mockup do arquivo `.xlsx` (screenshot da primeira aba renderizada).
- Preço grande em Lora: **R$129,90** · pagamento único · arquivo Excel + Google Sheets.
- Bullets: "Mesma metodologia E-S-D-E-C", "Funciona offline", "Você personaliza como quiser", "Suporte por email".
- CTA **placeholder** ("Quero a planilha") que por enquanto abre WhatsApp ou um `mailto:` — sem checkout real ainda. Deixo o link fácil de trocar depois.
- Bloco também mencionado discretamente dentro do pricing ("Não quer app? [Compre só a planilha →](#planilha)").

## 3. Assets da planilha

- Subir `Planilha_do_Erick_3-3.xlsx` como Lovable Asset e gerar screenshot da primeira aba (via LibreOffice/openpyxl) para usar como mockup visual na seção — sem expor o arquivo publicamente antes do checkout.
- Guardar o pointer JSON em `src/assets/planilha.asset.json` só para referência futura (não linkar download direto).

## 4. Fora de escopo (agora)

- Nada de Stripe/checkout real — botão é placeholder até você decidir provedor.
- Sem mudança em rotas autenticadas, schema, RLS ou lógica de negócio.
- Sem alterar gating do app (o limite de 1 mês do Starter é comunicado na LP; enforcement em runtime fica para outra rodada quando plugarmos billing).

## Ordem de execução

1. Editar `index.tsx` — 3 cards de pricing + bloco planilha.
2. Editar `pv2.tsx` — mesma estrutura no formato VSL.
3. Subir asset da planilha + gerar mockup.
4. QA responsivo (375 / 768 / 1280).