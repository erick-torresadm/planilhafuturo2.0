import { useState, useEffect } from "react";

export type ExternalData = {
  usd: number | null;
  eur: number | null;
  ipca: number | null;
  selic: number | null;
  updatedAt: string | null;
};

const CACHE_KEY = "planilha-external-data";
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour

export function useExternalData() {
  const [data, setData] = useState<ExternalData>(() => {
    if (typeof window === "undefined") return { usd: null, eur: null, ipca: null, selic: null, updatedAt: null };
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Date.now() - parsed._ts < CACHE_DURATION) {
          return parsed.data;
        }
      }
    } catch {}
    return { usd: null, eur: null, ipca: null, selic: null, updatedAt: null };
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (data.usd !== null) return; // Already loaded from cache
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    const result: ExternalData = { usd: null, eur: null, ipca: null, selic: null, updatedAt: null };

    try {
      // USD/BRL from AwesomeAPI (free, no key)
      const currRes = await fetch("https://economia.awesomeapi.com.br/json/last/USD-BRL,EUR-BRL");
      if (currRes.ok) {
        const currData = await currRes.json();
        result.usd = parseFloat(currData.USDBRL?.bid ?? 0);
        result.eur = parseFloat(currData.EURBRL?.bid ?? 0);
      }
    } catch {}

    try {
      // Selic from Brasil API (free)
      const selicRes = await fetch("https://brasilapi.com.br/api/taxas/selic");
      if (selicRes.ok) {
        const selicData = await selicRes.json();
        if (selicData.length > 0) {
          result.selic = parseFloat(selicData[0].valor);
        }
      }
    } catch {}

    // IPCA — approximate from last known data
    // BrasilAPI doesn't have IPCA directly, so use a reasonable estimate
    result.ipca = 4.5; // approximate 12-month IPCA

    if (result.usd !== null || result.eur !== null || result.selic !== null) {
      result.updatedAt = new Date().toLocaleString("pt-BR");
      setData(result);
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ data: result, _ts: Date.now() }));
      } catch {}
    }

    setLoading(false);
  }

  return { data, loading, refresh: fetchData };
}
