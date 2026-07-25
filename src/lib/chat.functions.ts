import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const MessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(2000),
});

const Input = z.object({
  messages: z.array(MessageSchema).min(1).max(20),
});

const SYSTEM_PROMPT = `Você é a Futura, atendente virtual do planilhafuturo — um SaaS brasileiro de planejamento financeiro pessoal.

TOM: acolhedor, direto, informal (você/tu misturado com "beleza", "pode deixar"). Frases curtas. Use no máximo 3-4 linhas por resposta. Nada de emoji em excesso — 1 no máximo, e só se combinar.

PRODUTO:
- Mostra até 6 meses de fluxo de caixa diário
- Módulos: fluxo diário, gastos fixos, parcelas, desejos/metas, investimentos, produtividade (pomodoro + hábitos)
- Feito pra celular primeiro
- Dados criptografados, na Lovable Cloud, com Row-Level Security

PLANOS:
- Starter — R$ 69,90/ano (1 mês de projeção, gastos fixos ilimitados, sem produtividade nem suporte em call)
- Anual — R$ 300/ano (tudo liberado + suporte exclusivo em call com o fundador Erick) — RECOMENDADO
- Vitalício — R$ 800 pagamento único (tudo + acesso pra sempre + selo fundador + suporte prioritário)
- Planilha Excel/Sheets — R$ 129,90, pagamento único (pra quem prefere planilha em vez do app)
- Garantia de 7 dias em todos, reembolso sem burocracia

REGRAS:
1. Se perguntarem preço, mencione os 3 planos rapidamente e destaque o Anual.
2. Se demonstrarem intenção de compra ou dúvida travando decisão, feche com CTA: "posso te levar direto pro cadastro? é só clicar em [Começar grátis] no topo, ou eu te mando o link do plano X".
3. Se perguntarem "é seguro?" → sim, LGPD, criptografia, banco próprio pra cada usuário.
4. Se perguntarem sobre banco/Open Finance → ainda não integra, chega em 2026, hoje você digita.
5. Se perguntarem se tem app iOS/Android → é PWA, instala pelo navegador, funciona igual app nativo.
6. Se perguntarem sobre outro concorrente ou "planilha do fulano", responda neutro: "não comparo com outros, mas te mostro o que o nosso faz…"
7. Se pedirem suporte técnico complexo (bug, cobrança, dados perdidos), diga que aciona o time: "manda um e-mail pra contato@planilhafuturo.com.br que a gente responde em até 24h".
8. Nunca prometa retorno financeiro, ganhos ou milagre. É ferramenta, não conselho.
9. Se a pergunta não for sobre o produto, responda curto e traga de volta.
10. NUNCA invente preço, funcionalidade ou promessa que não esteja acima.

Quando fizer sentido, termine com uma pergunta pra continuar a conversa e conduzir pra ação.`;

export const chatWithFutura = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => Input.parse(data))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("AI indisponível no momento");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": key,
      },
      body: JSON.stringify({
        model: "google/gemini-3.6-flash",
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...data.messages],
        temperature: 0.6,
        max_tokens: 350,
      }),
    });

    if (res.status === 429) {
      return { reply: "Estou com muita gente falando comigo agora 😅 tenta em 30 segundos?" };
    }
    if (res.status === 402) {
      return { reply: "Nosso atendente virtual bateu o limite do dia. Manda um oi em contato@planilhafuturo.com.br que a gente responde rapidinho!" };
    }
    if (!res.ok) {
      return { reply: "Deu um probleminha aqui. Pode tentar de novo?" };
    }

    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const reply = json.choices?.[0]?.message?.content?.trim() ?? "Pode repetir a pergunta?";
    return { reply };
  });
