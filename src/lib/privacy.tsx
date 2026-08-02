import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { brl } from "@/lib/format";

const KEY = "planilhafuturo_privacy";

/** Máscara padrão para valores grandes (KPI, cards). */
export const MASK = "R$ ••••";
/** Máscara compacta para células e linhas. */
export const DOTS = "••••";

type Ctx = { hidden: boolean; toggle: () => void };
const PrivacyCtx = createContext<Ctx>({ hidden: false, toggle: () => {} });

export function PrivacyProvider({ children }: { children: ReactNode }) {
  const [hidden, setHidden] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(KEY) === "1";
  });
  const toggle = useCallback(() => {
    setHidden((h) => {
      const nh = !h;
      try { localStorage.setItem(KEY, nh ? "1" : "0"); } catch { /* ignore */ }
      return nh;
    });
  }, []);
  return <PrivacyCtx.Provider value={{ hidden, toggle }}>{children}</PrivacyCtx.Provider>;
}

export function usePrivacy() {
  return useContext(PrivacyCtx);
}

/** Formata em BRL, ou retorna a máscara quando o modo privacidade está ativo. */
export function useBrl() {
  const { hidden } = usePrivacy();
  return useCallback(
    (v: number | string | null | undefined) => (hidden ? MASK : brl(v)),
    [hidden],
  );
}
