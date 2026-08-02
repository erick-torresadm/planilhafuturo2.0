/**
 * Gera src/generated/planilha-asset.ts com a Planilha do Erick em base64.
 *
 * A planilha (server-assets/Planilha_do_Erick.xlsx) NÃO é bundlada no serverless
 * function por import — Vercel/nitro não copiam arquivos não referenciados.
 * Embedamos os bytes como base64 no bundle do servidor para garantir a entrega
 * em qualquer preset (Vercel, Cloudflare, etc.).
 *
 * Rodado automaticamente no `npm run build` (ver package.json).
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "server-assets", "Planilha_do_Erick.xlsx");
const outDir = join(root, "src", "generated");
const out = join(outDir, "planilha-asset.ts");

// O .xlsx é gitignored (asset pago) e não existe no build da Vercel.
// Quando ausente, mantém o asset gerado já commitado.
if (!existsSync(src)) {
  console.log(`[gen-assets] ${basename(src)} não encontrado — mantendo asset gerado existente.`);
  process.exit(0);
}

const b64 = readFileSync(src).toString("base64");
mkdirSync(outDir, { recursive: true });
writeFileSync(
  out,
  `// Arquivo gerado por scripts/gen-assets.mjs — NÃO editar manualmente.\n// Planilha_do_Erick.xlsx codificada em base64 (bundle do servidor).\nexport const PLANILHA_ERICK_XLSX_B64 =\n  ${JSON.stringify(b64)};\n`,
);
console.log(`[gen-assets] ${out} gerado (${b64.length} chars base64)`);
