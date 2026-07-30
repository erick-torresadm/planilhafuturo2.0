import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Bot, User, Sparkles, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { chat, buildSystemPrompt, parseAction, hasApiKey, type AIChatMessage, type AppDataForAI } from "@/lib/ai-service";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  error?: boolean;
};

interface Props {
  appData?: AppDataForAI;
}

export function ChatWidget({ appData }: Props) {
  const data = appData ?? {
    saldoHoje: 0,
    saldoInicial: 0,
    totalEntradas: 0,
    totalSaidas: 0,
    saldoFimMes: 0,
    totalInvestido: 0,
    gastosFixos: 0,
    parcelasMes: 0,
    rendaMensal: 0,
  };
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      text: hasApiKey()
        ? "Olá! 👋 Como posso ajudar? Posso registrar gastos, analisar suas finanças ou dar dicas."
        : "Olá! 👋 Configure sua chave da API Gemini em **Configurações > IA** para eu poder ajudar.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 300);
  }, [open]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");

    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: "user", text };
    setMsgs((prev) => [...prev, userMsg]);

    setLoading(true);
    try {
      const system = buildSystemPrompt(data);
      const history: AIChatMessage[] = [
        { role: "system", content: system },
        ...msgs
          .filter((m) => m.id !== "welcome")
          .map((m) => ({ role: m.role as "user" | "assistant", content: m.text })),
        { role: "user", content: text },
      ];

      const reply = await chat(history);

      // Check if AI wants to perform an action
      const action = parseAction(reply);
      if (action) {
        await executeAction(action);
        qc.invalidateQueries(); // Refresh all data
      }

      // Clean action JSON from display text
      const cleanText = reply.replace(/\{[\s\S]*?\}\n?---?\n?/, "").trim() || reply;

      setMsgs((prev) => [...prev, { id: crypto.randomUUID(), role: "assistant", text: cleanText }]);
    } catch (err: any) {
      setMsgs((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "assistant", text: err.message || "Erro ao comunicar com a IA.", error: true },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function executeAction(action: { action: string; data: any }) {
    if (action.action === "add_lancamento") {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (!userId) {
        setMsgs((prev) => [...prev, {
          id: crypto.randomUUID(),
          role: "assistant",
          text: "⚠️ Você precisa estar autenticado para registrar lançamentos. Faça login e tente novamente.",
          error: true,
        }]);
        return;
      }

      const { insertRow } = await import("@/lib/db");
      const { data: d } = action;

      // Validate required fields
      if (!d.tipo || !["entrada_fixa", "entrada_diaria", "saida_diaria"].includes(d.tipo)) {
        setMsgs((prev) => [...prev, {
          id: crypto.randomUUID(),
          role: "assistant",
          text: "❌ Tipo de lançamento inválido. Use: entrada_fixa, entrada_diaria ou saida_diaria.",
          error: true,
        }]);
        return;
      }

      try {
        await insertRow("lancamentos", {
          data: d.data || new Date().toISOString().slice(0, 10),
          tipo: d.tipo,
          valor: Number(d.valor) || 0,
          descricao: d.descricao || "",
          user_id: userId,
        });
        setMsgs((prev) => [...prev, {
          id: crypto.randomUUID(),
          role: "assistant",
          text: `✅ Registrado: ${d.descricao || d.tipo} — R$ ${Number(d.valor).toFixed(2)}`,
        }]);
      } catch (err: any) {
        setMsgs((prev) => [...prev, {
          id: crypto.randomUUID(),
          role: "assistant",
          text: `❌ Erro ao registrar lançamento: ${err.message}`,
          error: true,
        }]);
      }
    }
  }

  return (
    <>
      {/* FAB to open chat */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-24 right-5 lg:bottom-20 lg:right-8 z-40 h-12 w-12 rounded-full bg-gradient-to-br from-primary to-emerald-400 text-primary-foreground shadow-lg grid place-items-center active:scale-90 transition-transform hover:shadow-xl"
          aria-label="Abrir chat IA"
        >
          <MessageCircle className="h-5 w-5" strokeWidth={2} />
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed inset-0 z-50 grid place-items-end sm:place-items-end sm:pb-24 sm:pr-8 pointer-events-none">
          <div
            className="pointer-events-auto relative w-full sm:w-[380px] h-[70vh] sm:h-[520px] sm:max-h-[80vh] bg-card border border-border rounded-t-2xl sm:rounded-2xl shadow-modal flex flex-col overflow-hidden animate-in-fast"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-gradient-to-r from-primary/5 to-transparent shrink-0">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary/10 grid place-items-center">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <div className="text-sm font-semibold">Assistente Financeiro</div>
                  <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-positive inline-block" />
                    {hasApiKey() ? "Gemini ativo" : "Sem API key"}
                  </div>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="h-8 w-8 rounded-lg grid place-items-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Messages */}
            <div ref={listRef} className="flex-1 overflow-y-auto p-4 space-y-3">
              {msgs.map((m) => (
                <div key={m.id} className={cn("flex gap-2", m.role === "user" ? "justify-end" : "justify-start")}>
                  {m.role === "assistant" && (
                    <div className="h-7 w-7 rounded-full bg-primary/10 grid place-items-center shrink-0 mt-0.5">
                      <Bot className="h-3.5 w-3.5 text-primary" />
                    </div>
                  )}
                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap",
                      m.role === "user"
                        ? "bg-primary text-primary-foreground rounded-tr-md"
                        : m.error
                          ? "bg-negative-soft text-negative border border-negative/20 rounded-tl-md"
                          : "bg-muted text-foreground rounded-tl-md",
                    )}
                  >
                    {m.text}
                  </div>
                  {m.role === "user" && (
                    <div className="h-7 w-7 rounded-full bg-primary grid place-items-center shrink-0 mt-0.5">
                      <User className="h-3.5 w-3.5 text-primary-foreground" />
                    </div>
                  )}
                </div>
              ))}
              {loading && (
                <div className="flex gap-2">
                  <div className="h-7 w-7 rounded-full bg-primary/10 grid place-items-center shrink-0">
                    <Bot className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div className="bg-muted rounded-2xl rounded-tl-md px-3.5 py-2.5 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Pensando...
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Suggestions */}
            {msgs.length <= 1 && hasApiKey() && (
              <div className="px-4 pb-2 flex gap-1.5 overflow-x-auto no-scrollbar shrink-0">
                {["Comprei sorvete R$10", "Analise minhas finanças", "Quanto posso gastar?"].map((s) => (
                  <button
                    key={s}
                    onClick={() => { setInput(s); inputRef.current?.focus(); }}
                    className="shrink-0 text-[11px] px-2.5 py-1.5 rounded-full bg-muted text-muted-foreground hover:text-foreground hover:bg-accent transition-colors whitespace-nowrap"
                  >
                    <Sparkles className="h-3 w-3 inline mr-1" />
                    {s}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="p-3 border-t border-border shrink-0">
              <div className="flex items-center gap-2 bg-muted/50 rounded-xl border border-border focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary transition-all">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                  placeholder={hasApiKey() ? "Digite sua mensagem..." : "Configure a API key..."}
                  disabled={!hasApiKey()}
                  className="flex-1 bg-transparent outline-none px-3.5 py-2.5 text-sm"
                />
                <button
                  onClick={send}
                  disabled={!input.trim() || loading || !hasApiKey()}
                  className="h-8 w-8 rounded-lg bg-primary text-primary-foreground grid place-items-center mr-1.5 disabled:opacity-30 active:scale-90 transition-all"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground/60 mt-1.5 text-center">
                Google Gemini · <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">gratuito</a>
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
