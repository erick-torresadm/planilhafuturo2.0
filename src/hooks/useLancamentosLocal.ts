import { useEffect, useState } from "react";
import type { Lancamento } from "@/lib/finance";

const LS_KEY = "fluxo_lancamentos_v1";

export function useLancamentosLocal() {
  const [list, setList] = useState<Lancamento[]>(() => {
    if (typeof window === "undefined") return [];
    try { return JSON.parse(localStorage.getItem(LS_KEY) || "[]"); } catch { return []; }
  });

  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(list)); } catch {}
  }, [list]);

  function upsert(data: string, tipo: string, valor: number) {
    setList((prev) => {
      const idx = prev.findIndex((l) => l.data === data && l.tipo === tipo);
      if (idx >= 0) {
        if (valor === 0) return prev.filter((_, i) => i !== idx);
        const copy = [...prev];
        copy[idx] = { ...copy[idx], valor };
        return copy;
      }
      if (valor === 0) return prev;
      return [...prev, { id: crypto.randomUUID(), data, tipo: tipo as Lancamento["tipo"], valor }];
    });
  }

  return { list, upsert };
}
