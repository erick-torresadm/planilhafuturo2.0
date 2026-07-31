import { useEffect, useState } from "react";
import { Cookie } from "lucide-react";
import { Button } from "@/components/ui/button";

const CONSENT_KEY = "pf_cookie_consent";

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!localStorage.getItem(CONSENT_KEY)) {
      // Pequeno atraso para não competir com o conteúdo da primeira tela
      const t = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(t);
    }
  }, []);

  function choose(value: "todos" | "essenciais") {
    localStorage.setItem(CONSENT_KEY, value);
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[70] px-3 pb-3 pointer-events-none">
      <div className="pointer-events-auto mx-auto max-w-md rounded-2xl border border-border bg-card/95 backdrop-blur-md shadow-lg p-4 animate-slide-up">
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary grid place-items-center shrink-0">
            <Cookie className="h-4.5 w-4.5" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold">Respeitamos sua privacidade</p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              Usamos apenas cookies essenciais (para manter você logado) e análises agregadas e anônimas.
              Nunca vendemos seus dados. Saiba mais na{" "}
              <a href="/privacidade" className="text-primary underline">Política de Privacidade</a>.
            </p>
            <div className="flex gap-2 mt-3">
              <Button size="sm" variant="outline" className="flex-1" onClick={() => choose("essenciais")}>
                Só essenciais
              </Button>
              <Button size="sm" className="flex-1" onClick={() => choose("todos")}>
                Aceitar todos
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
