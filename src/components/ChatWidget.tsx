import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { MessageCircle, X, Send, Sparkles } from "lucide-react";
import { chatWithFutura } from "@/lib/chat.functions";

type Msg = { role: "user" | "assistant"; content: string };

const QUICK: Array<{ label: string; text: string }> = [
  { label: "Quanto custa?", text: "Quanto custa o plano completo?" },
  { label: "É seguro?", text: "Como funciona a segurança dos meus dados?" },
  { label: "App ou planilha?", text: "Devo comprar o app ou a planilha? Qual é a diferença?" },
  { label: "Quero começar", text: "Quero começar agora, o que eu faço?" },
];

const WELCOME: Msg = {
  role: "assistant",
  content:
    "Oi! Eu sou a Futura 👋 assistente do planilhafuturo. Posso te ajudar com preços, funcionalidades, segurança ou te levar direto pro cadastro. O que você quer saber?",
};

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [unread, setUnread] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (open) setUnread(false);
  }, [open]);

  async function send(text: string) {
    const clean = text.trim();
    if (!clean || loading) return;
    const next = [...messages, { role: "user" as const, content: clean }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await chatWithFutura({
        data: { messages: next.slice(-10) },
      });
      setMessages((m) => [...m, { role: "assistant", content: res.reply }]);
    } catch {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: "Deu ruim aqui do meu lado. Tenta de novo? Se persistir, escreve pra contato@planilhafuturo.com.br 🙏",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Launcher */}
      <motion.button
        onClick={() => setOpen((v) => !v)}
        initial={{ scale: 0, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ delay: 1.2, type: "spring", stiffness: 200, damping: 15 }}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
        aria-label={open ? "Fechar chat" : "Abrir chat"}
        className="fixed bottom-4 right-4 z-[65] h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-[0_0_0_1px_rgba(115,255,184,0.5),0_20px_50px_-10px_rgba(45,212,168,0.7)] flex items-center justify-center"
      >
        <AnimatePresence mode="wait">
          {open ? (
            <motion.div key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
              <X className="h-6 w-6" />
            </motion.div>
          ) : (
            <motion.div key="msg" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
              <MessageCircle className="h-6 w-6" />
            </motion.div>
          )}
        </AnimatePresence>
        {unread && !open && (
          <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-negative text-[10px] font-mono flex items-center justify-center text-background">
            1
          </span>
        )}
        <span className="absolute inset-0 rounded-full bg-primary/40 animate-ping -z-10" />
      </motion.button>

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="fixed bottom-20 right-4 left-4 sm:left-auto sm:w-[380px] h-[70vh] sm:h-[560px] max-h-[calc(100vh-6rem)] z-[65] rounded-2xl border border-primary/30 bg-card/95 backdrop-blur-xl shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)] flex flex-col overflow-hidden"
          >
            {/* header */}
            <div className="px-4 py-3 border-b border-border bg-gradient-to-r from-primary/10 to-transparent flex items-center gap-3">
              <div className="relative h-9 w-9 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-primary border-2 border-card" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-sm leading-tight">Futura</div>
                <div className="text-[10px] font-mono text-primary flex items-center gap-1">
                  <span className="h-1 w-1 rounded-full bg-primary animate-pulse" />
                  online · responde em segundos
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground" aria-label="Fechar">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 text-sm">
              {messages.map((m, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl leading-relaxed whitespace-pre-wrap ${
                      m.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-surface-2/60 border border-border rounded-bl-md"
                    }`}
                  >
                    {m.content}
                  </div>
                </motion.div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-surface-2/60 border border-border px-4 py-3 rounded-2xl rounded-bl-md flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "120ms" }} />
                    <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "240ms" }} />
                  </div>
                </div>
              )}
            </div>

            {/* quick replies */}
            {messages.length <= 2 && !loading && (
              <div className="px-4 pb-2 flex flex-wrap gap-1.5">
                {QUICK.map((q) => (
                  <button
                    key={q.label}
                    onClick={() => send(q.text)}
                    className="text-[11px] font-mono rounded-full border border-primary/30 bg-primary/5 text-primary px-2.5 py-1 hover:bg-primary hover:text-primary-foreground transition"
                  >
                    {q.label}
                  </button>
                ))}
              </div>
            )}

            {/* composer */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
              className="p-3 border-t border-border flex items-center gap-2"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Escreva sua dúvida…"
                disabled={loading}
                className="flex-1 rounded-full border border-border bg-background/60 px-4 py-2.5 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                aria-label="Enviar"
                className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:brightness-110 disabled:opacity-40"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
