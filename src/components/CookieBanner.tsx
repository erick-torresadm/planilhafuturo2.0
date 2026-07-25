import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Cookie, X } from "lucide-react";

const KEY = "pf_cookie_consent";

export function CookieBanner() {
  const [show, setShow] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) setShow(true);
    } catch {
      // ignore
    }
  }, []);

  function save(choice: "all" | "essential") {
    try {
      localStorage.setItem(KEY, JSON.stringify({ choice, at: Date.now() }));
    } catch {
      // ignore
    }
    setShow(false);
  }

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="fixed bottom-3 left-3 right-3 sm:bottom-5 sm:left-auto sm:right-5 sm:max-w-sm z-[70]"
        >
          <div className="relative rounded-2xl border border-primary/30 bg-card/95 backdrop-blur-xl p-5 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)]">
            <button
              aria-label="Fechar"
              onClick={() => save("essential")}
              className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                <Cookie className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-sm">Cookies, mas dos bons.</div>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Usamos cookies essenciais e uma análise agregada anônima. Sem rastreador de anúncios,
                  sem venda de dados.{" "}
                  <button onClick={() => setExpanded((v) => !v)} className="text-primary hover:underline">
                    {expanded ? "menos" : "detalhes"}
                  </button>
                </p>
                <AnimatePresence>
                  {expanded && (
                    <motion.ul
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="mt-2 text-[11px] font-mono text-muted-foreground overflow-hidden space-y-1"
                    >
                      <li>▸ sessão · manter login</li>
                      <li>▸ preferências · tema, idioma</li>
                      <li>▸ análise · páginas vistas (anônimo)</li>
                    </motion.ul>
                  )}
                </AnimatePresence>
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => save("all")}
                    className="flex-1 rounded-full bg-primary text-primary-foreground text-xs font-semibold py-2 hover:brightness-110"
                  >
                    Aceitar tudo
                  </button>
                  <button
                    onClick={() => save("essential")}
                    className="flex-1 rounded-full border border-border text-xs font-semibold py-2 hover:border-primary/40 hover:text-primary"
                  >
                    Só essenciais
                  </button>
                </div>
                <a
                  href="/cookies"
                  className="mt-3 block text-[10px] font-mono uppercase tracking-widest text-muted-foreground/70 hover:text-primary"
                >
                  ler política de cookies →
                </a>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
