import { useCallback, useEffect, useRef } from "react";

export type SoundKind =
  | "moeda" | "pop" | "kaching" | "alerta"
  | "celebration" | "ding" | "star" | "fanfarra"
  | "coins-up" | "bell" | "clock";

type Settings = { enabled: boolean; volume: number; silentDaytime: boolean };

const KEY = "planilha-sounds";
function loadSettings(): Settings {
  if (typeof window === "undefined") return { enabled: true, volume: 0.6, silentDaytime: false };
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { enabled: true, volume: 0.6, silentDaytime: false, ...JSON.parse(raw) };
  } catch {}
  return { enabled: true, volume: 0.6, silentDaytime: false };
}
export function saveSoundSettings(s: Settings) {
  localStorage.setItem(KEY, JSON.stringify(s));
}
export function getSoundSettings(): Settings {
  return loadSettings();
}

function inSilentWindow(): boolean {
  const d = new Date();
  const wd = d.getDay();
  const h = d.getHours();
  if (wd === 0 || wd === 6) return true;
  return h >= 9 && h < 18;
}

function play(ctx: AudioContext, freqs: [number, number][], vol: number, waveform: OscillatorType = "sine") {
  const now = ctx.currentTime;
  freqs.forEach(([f, t], i) => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = waveform;
    osc.frequency.value = f;
    g.gain.setValueAtTime(0, now + i * 0.05);
    g.gain.linearRampToValueAtTime(vol, now + i * 0.05 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + t);
    osc.connect(g).connect(ctx.destination);
    osc.start(now + i * 0.05);
    osc.stop(now + i * 0.05 + t + 0.02);
  });
}

export function useSounds() {
  const ctxRef = useRef<AudioContext | null>(null);
  useEffect(() => {
    return () => { ctxRef.current?.close(); };
  }, []);

  const playSound = useCallback((kind: SoundKind) => {
    const s = loadSettings();
    if (!s.enabled) return;
    if (s.silentDaytime && inSilentWindow()) return;
    if (typeof window === "undefined") return;
    try {
      if (!ctxRef.current) ctxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      const ctx = ctxRef.current!;
      const v = s.volume;
      switch (kind) {
        case "moeda": play(ctx, [[880, 0.15], [1320, 0.2]], v); break;
        case "pop": play(ctx, [[440, 0.1]], v, "triangle"); break;
        case "kaching": play(ctx, [[660, 0.1], [990, 0.15], [1320, 0.3]], v); break;
        case "alerta": play(ctx, [[220, 0.3], [180, 0.3]], v, "square"); break;
        case "celebration": play(ctx, [[523, 0.15], [659, 0.15], [784, 0.25]], v); break;
        case "ding": play(ctx, [[1046, 0.4]], v); break;
        case "star": play(ctx, [[1568, 0.1], [2093, 0.2]], v); break;
        case "fanfarra": play(ctx, [[523, 0.15], [659, 0.15], [784, 0.15], [1046, 0.4]], v); break;
        case "coins-up": play(ctx, [[440, 0.08], [660, 0.08], [880, 0.08], [1320, 0.2]], v); break;
        case "bell": play(ctx, [[880, 0.5]], v * 0.6); break;
        case "clock": play(ctx, [[440, 0.15], [440, 0.15]], v * 0.5, "triangle"); break;
      }
    } catch {}
  }, []);

  return { playSound };
}
