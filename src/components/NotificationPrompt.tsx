import { useEffect, useState } from "react";
import { BellRing, X } from "lucide-react";

/**
 * Pedido de permissão de notificação na primeira visita.
 * A ideia do planilhafuturo é o usuário pagar pra NÃO precisar saber mexer em
 * fórmula: o app faz as contas e avisa (conta vencendo, parcela terminando,
 * sobra/falta de dinheiro). Por isso o popup explica o valor em vez de só
 * pedir permissão.
 *
 * Só aparece uma vez (guarda flag no localStorage) e só quando o browser
 * ainda não decidiu (permission === "default").
 */
const SEEN_KEY = "pf_notif_prompt_v1";

export function NotificationPrompt() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) return;
    if (Notification.permission !== "default") return; // já aceitou ou recusou
    if (localStorage.getItem(SEEN_KEY)) return;

    const t = setTimeout(() => setShow(true), 2000);
    return () => clearTimeout(t);
  }, []);

  function finish() {
    localStorage.setItem(SEEN_KEY, "1");
    setShow(false);
  }

  async function handleAccept() {
    try {
      const res = await Notification.requestPermission();
      if (res === "granted") {
        // notificação de boas-vindas confirmando que ativou
        new Notification("Lembretes ativos! 🎉", {
          body: "A gente avisa antes das contas vencerem. Sem você mexer em fórmula nenhuma.",
        });
      }
    } catch {
      /* usuário fechou o nativo — segue a vida */
    }
    finish();
  }

  if (!show) return null;

  return (
    <div className="fixed inset-x-4 bottom-20 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-[360px] z-[60]">
      <div className="rounded-2xl border border-border bg-card shadow-xl overflow-hidden animate-slide-up">
        <div className="flex items-start gap-3 p-4">
          <div className="h-10 w-10 rounded-xl bg-primary/10 grid place-items-center shrink-0">
            <BellRing className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-display font-bold text-[15px]">Deixa a gente lembrar por você</h3>
              <button onClick={finish} aria-label="Fechar" className="text-muted-foreground hover:text-foreground shrink-0">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              A ideia do planilhafuturo é você <strong className="text-foreground">pagar pra não precisar saber mexer em fórmula</strong>.
              O app faz as contas e te avisa: antes da conta vencer, quando a parcela termina, se vai sobrar ou faltar dinheiro.
            </p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={handleAccept}
                className="flex-1 h-10 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition"
              >
                Ativar notificações
              </button>
              <button
                onClick={finish}
                className="h-10 px-4 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-muted transition"
              >
                Agora não
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
