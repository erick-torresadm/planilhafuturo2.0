import assert from "node:assert/strict";
import {
  precoPlano,
  calcularPeriodo,
  deriveTier,
  podeReembolsar,
  precisaAvisoRenovacao,
  podeVer,
  videoEmbedUrl,
  CLUB_PLANOS,
  VALOR_PLANILHA_AVULSA,
} from "../src/lib/club.rules";

const dia = 24 * 60 * 60 * 1000;
const agora = new Date("2026-09-04T12:00:00Z");
const iso = (d: Date) => d.toISOString();

// preços
assert.deepEqual(precoPlano("start", false), { valor: 238.8, source: "new" });
assert.deepEqual(precoPlano("start", true), { valor: 168.8, source: "upgrade_from_avulsa" });
assert.deepEqual(precoPlano("premium", false), { valor: 358.8, source: "new" });
assert.deepEqual(precoPlano("premium", true), { valor: 358.8, source: "new" });
assert.equal(CLUB_PLANOS.start.valor - VALOR_PLANILHA_AVULSA, 168.8);

// período: novo começa agora; renovação antes do fim começa no fim anterior
let p = calcularPeriodo(agora, null);
assert.equal(iso(p.start), iso(agora));
assert.equal(p.end.getTime() - p.start.getTime(), 365 * dia);
const fimFuturo = new Date(agora.getTime() + 3 * dia);
p = calcularPeriodo(agora, fimFuturo);
assert.equal(iso(p.start), iso(fimFuturo));
const fimPassado = new Date(agora.getTime() - 3 * dia);
p = calcularPeriodo(agora, fimPassado);
assert.equal(iso(p.start), iso(agora));

// tier
assert.equal(deriveTier([], agora), "none");
assert.equal(
  deriveTier([{ plan: "start", status: "active", current_period_end: iso(fimFuturo) }], agora),
  "start",
);
assert.equal(
  deriveTier([{ plan: "premium", status: "active", current_period_end: iso(fimPassado) }], agora),
  "none",
);
assert.equal(
  deriveTier([{ plan: "premium", status: "pending", current_period_end: iso(fimFuturo) }], agora),
  "none",
);

// reembolso: 7 dias, só origem paga, só ativa
const inicioRecente = iso(new Date(agora.getTime() - 2 * dia));
const inicioAntigo = iso(new Date(agora.getTime() - 8 * dia));
assert.equal(
  podeReembolsar({ source: "new", status: "active", current_period_start: inicioRecente }, agora),
  true,
);
assert.equal(
  podeReembolsar({ source: "new", status: "active", current_period_start: inicioAntigo }, agora),
  false,
);
assert.equal(
  podeReembolsar(
    { source: "vitalicio_included", status: "active", current_period_start: inicioRecente },
    agora,
  ),
  false,
);
assert.equal(
  podeReembolsar({ source: "new", status: "canceled", current_period_start: inicioRecente }, agora),
  false,
);
// período que ainda não começou (renovação antecipada) não é reembolsável
const inicioFuturo = iso(new Date(agora.getTime() + 3 * dia));
assert.equal(
  podeReembolsar({ source: "new", status: "active", current_period_start: inicioFuturo }, agora),
  false,
);
// borda: exatamente 7 dias ainda está dentro da janela
const inicioBorda = iso(new Date(agora.getTime() - 7 * dia));
assert.equal(
  podeReembolsar({ source: "new", status: "active", current_period_start: inicioBorda }, agora),
  true,
);

// aviso de renovação: ativa, sem cancelamento, sem aviso ainda, fim em ≤ 7 dias
const base = { status: "active" as const, cancel_renewal: false, renewal_notice_sent_at: null };
assert.equal(
  precisaAvisoRenovacao(
    { ...base, current_period_end: iso(new Date(agora.getTime() + 6 * dia)) },
    agora,
  ),
  true,
);
assert.equal(
  precisaAvisoRenovacao(
    { ...base, current_period_end: iso(new Date(agora.getTime() + 8 * dia)) },
    agora,
  ),
  false,
);
assert.equal(
  precisaAvisoRenovacao(
    { ...base, cancel_renewal: true, current_period_end: iso(new Date(agora.getTime() + 6 * dia)) },
    agora,
  ),
  false,
);
assert.equal(
  precisaAvisoRenovacao(
    {
      ...base,
      renewal_notice_sent_at: iso(agora),
      current_period_end: iso(new Date(agora.getTime() + 6 * dia)),
    },
    agora,
  ),
  false,
);

// níveis cumulativos
assert.equal(podeVer("none", "free"), true);
assert.equal(podeVer("none", "start"), false);
assert.equal(podeVer("start", "start"), true);
assert.equal(podeVer("start", "premium"), false);
assert.equal(podeVer("premium", "free"), true);
assert.equal(podeVer("premium", "premium"), true);

// embed
assert.equal(
  videoEmbedUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=1s"),
  "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
);
assert.equal(
  videoEmbedUrl("https://youtu.be/dQw4w9WgXcQ"),
  "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
);
assert.equal(
  videoEmbedUrl("https://vimeo.com/123456789"),
  "https://player.vimeo.com/video/123456789",
);
assert.equal(videoEmbedUrl("https://example.com/x"), null);
assert.equal(videoEmbedUrl(null), null);

console.log("club.rules ok");
