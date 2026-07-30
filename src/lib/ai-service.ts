/**
 * AI Service — Google Gemini API integration.
 * Free tier: 60 requests/min, no cost.
 * Get API key: https://aistudio.google.com/app/apikey
 *
 * The system prompt teaches Gemini about the app's data model
 * so it can parse natural language into actions.
 */

const STORAGE_KEY = "planilha-gemini-key";
const MODEL = "gemini-2.0-flash-lite";

export function getApiKey(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(STORAGE_KEY) ?? "";
}

export function setApiKey(key: string) {
  localStorage.setItem(STORAGE_KEY, key);
}

export function hasApiKey(): boolean {
  return !!getApiKey();
}

export type AIChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

/** Call Gemini with a conversation and return the text reply */
export async function chat(messages: AIChatMessage[]): Promise<string> {
  const key = getApiKey();
  if (!key) throw new Error("API key não configurada. Vá em Configurações > IA para adicionar.");

  // Filter out system messages — Gemini uses system_instruction instead
  const systemMsg = messages.find((m) => m.role === "system")?.content ?? "";
  const history = messages.filter((m) => m.role !== "system").map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: systemMsg ? { parts: [{ text: systemMsg }] } : undefined,
        contents: history.length > 0 ? history : undefined,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024,
        },
      }),
    },
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini error (${res.status}): ${err}`);
  }

  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "Sem resposta.";
}

/**
 * Build the system prompt describing the app's data model.
 * This tells the AI what tables exist and how to help.
 */
export function buildSystemPrompt(data: AppDataForAI): string {
  return `Você é um assistente financeiro pessoal integrado ao planilhafuturo — um app de planejamento financeiro pessoal brasileiro.

## Dados do usuário
- Saldo disponível hoje: R$ ${data.saldoHoje.toFixed(2)}
- Saldo inicial do mês: R$ ${data.saldoInicial.toFixed(2)}
- Entradas este mês: R$ ${data.totalEntradas.toFixed(2)}
- Saídas este mês: R$ ${data.totalSaidas.toFixed(2)}
- Projeção fim do mês: R$ ${data.saldoFimMes.toFixed(2)}
- Total investido: R$ ${data.totalInvestido.toFixed(2)}

## Estrutura do banco de dados (localStorage)

O banco tem estes tipos de registro:

### lancamentos (fluxo diário)
São lançamentos avulsos no fluxo de caixa. Cada um tem:
- data (YYYY-MM-DD)
- tipo: "entrada_fixa" | "entrada_diaria" | "saida_diaria"
- valor (number)

### gastos_fixos
Contas recorrentes:
- descricao, valor, categoria (Moradia/Saude/Lazer/Transporte/Imposto/Educacao/Alimentacao/Telefonia/Outros)
- dia (dia do mês), tipo (P=Parcelado, A=Assinatura, C=Contrato)
- frequencia: "mensal" | "anual", forma: "Pix" | "Cartao" | "Debito" | "Boleto"
- ativo: boolean

### parcelas
Compras parceladas no cartão:
- descricao, valor_total, qtd_parcelas, parcela_inicial
- cartao, categoria

### desejos
Lista de desejos:
- item, valor, tipo, parcelado (boolean), qtd_parcelas

### caixinhas
Metas de economia:
- nome, meta, atual

### investimentos
Carteira:
- nome, tipo (CDB/Fundo/Tesouro/Acao/Cripto/Outro), valor_aplicado, posicao_atual

### tarefas
Tarefas financeiras:
- descricao, data, tipo, status (pendente/feito/atrasado), valor

## O que você pode fazer

### 1. Registrar gasto no fluxo
Se o usuário disser algo como "comprei sorvete por R$10 hoje", responda com um JSON:
{"action":"add_lancamento","data":{"data":"2026-07-30","tipo":"saida_diaria","valor":10,"descricao":"Sorvete"}}

### 2. Registrar entrada
"recebi R$500 de freela" → {"action":"add_lancamento","data":{"data":"2026-07-30","tipo":"entrada_diaria","valor":500,"descricao":"Freela"}}

### 3. Análise e conselhos
Se o usuário pedir análise, dê conselhos baseados nos dados dele:
- Se a projeção de fim de mês for negativa, sugira cortar gastos
- Compare gastos fixos com a renda
- Sugira metas baseadas na sobra mensal

### 4. Responder perguntas gerais
"quanto posso gastar esse mês?", "qual meu maior gasto?", etc.

### 5. Dados externos (USD, inflação)
Se perguntar sobre dólar, inflação, IPCA, use seu conhecimento atual para responder com dados aproximados e sempre avise que é uma estimativa.

## Regras importantes
- SEMPRE responda em português brasileiro
- Seja amigável e direto
- Use linguagem simples
- Para ações de registro, SEMPRE retorne o JSON de ação primeiro, depois uma mensagem amigável
- Para dicas financeiras, considere a realidade brasileira (juros, inflação, etc.)
- Se não entender algo, peça esclarecimento
- NUNCA invente dados que não existem — use apenas o contexto fornecido

## Formato de resposta para ações
Sempre que for executar uma ação, seu primeiro caractere DEVE ser { iniciando o JSON. Depois do JSON, coloque "---" e sua mensagem.

Exemplo:
{"action":"add_lancamento","data":{"data":"2026-07-30","tipo":"saida_diaria","valor":10,"descricao":"Sorvete"}}
---
Anotei! R$10 de sorvete registrado como saída de hoje. 🍦`;
}

export interface AppDataForAI {
  saldoHoje: number;
  saldoInicial: number;
  totalEntradas: number;
  totalSaidas: number;
  saldoFimMes: number;
  totalInvestido: number;
  gastosFixos: number;
  parcelasMes: number;
  rendaMensal: number;
}

/** Extract action JSON from AI response */
export function parseAction(text: string): { action: string; data: any } | null {
  try {
    const jsonMatch = text.match(/\{[\s\S]*?\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.action) return parsed;
    }
  } catch {}
  return null;
}
