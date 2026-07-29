/**
 * Local database — stores all data in localStorage.
 * Drop-in replacement for Supabase during local dev.
 * Tables: profiles, gastos_fixos, parcelas, desejos, caixinhas,
 *         investimentos, tarefas, focos_diarios, pomodoros, habitos, habitos_registros
 */

const PREFIX = "pf_";

function storageKey(table: string) {
  return `${PREFIX}${table}`;
}

function readTable<T = any>(table: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(storageKey(table)) || "[]");
  } catch {
    return [];
  }
}

function writeTable(table: string, data: any[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(storageKey(table), JSON.stringify(data));
}

/** Seed default data if table is empty */
function seedIfEmpty(table: string, rows: any[]) {
  const existing = readTable(table);
  if (existing.length === 0) {
    writeTable(table, rows);
  }
}

/** Ensure default profile exists */
function ensureProfile() {
  const profiles = readTable("profiles");
  if (profiles.length === 0) {
    profiles.push({
      id: "local-dev-user",
      nome: "Você",
      email: "dev@local.dev",
      saldo_inicial: 2500,
      renda_mensal: 7000,
      meta_renda_fixa: 5000,
      meses_reserva_emergencia: 6,
    });
    writeTable("profiles", profiles);
  }
}

// ─── Public API ───────────────────────────────────────────────

export function selectAll<T = any>(table: string): T[] {
  return readTable<T>(table);
}

export function insertRow<T extends Record<string, any> = any>(table: string, row: T): T {
  const rows = readTable(table);
  const newRow = { ...row, id: row.id || crypto.randomUUID() } as T;
  rows.push(newRow);
  writeTable(table, rows);
  return newRow;
}

export function updateRow<T = any>(table: string, id: string, patch: Partial<T>): T | null {
  const rows = readTable<any>(table);
  const idx = rows.findIndex((r) => r.id === id);
  if (idx === -1) return null;
  rows[idx] = { ...rows[idx], ...patch };
  writeTable(table, rows);
  return rows[idx];
}

export function deleteRow(table: string, id: string): boolean {
  const rows = readTable(table);
  const idx = rows.findIndex((r) => r.id === id);
  if (idx === -1) return false;
  rows.splice(idx, 1);
  writeTable(table, rows);
  return true;
}

/** Get single profile (there's always one in local dev) */
export function getProfile(): Record<string, any> {
  ensureProfile();
  return readTable("profiles")[0] || { id: "local-dev-user", nome: "Você" };
}

/** Update profile */
export function updateProfile(patch: Record<string, any>) {
  const profiles = readTable("profiles");
  if (profiles.length === 0) {
    profiles.push({ id: "local-dev-user", ...patch });
  } else {
    Object.assign(profiles[0], patch);
  }
  writeTable("profiles", profiles);
  return profiles[0];
}

const SEEDED_KEY = "pf_seeded";

// ─── Seed all tables with demo data ───────────────────────────

export function seedAllTables() {
  if (typeof window !== "undefined") {
    try {
      if (localStorage.getItem(SEEDED_KEY)) return;
    } catch {}
  }
  ensureProfile();

  seedIfEmpty("gastos_fixos", [
    { id: "g1", categoria: "Moradia", descricao: "Aluguel", valor: 1800, tipo: "C", frequencia: "mensal", dia: 5, mes_anual: null, forma: "Pix", ativo: true },
    { id: "g2", categoria: "Alimentacao", descricao: "Mercado mensal", valor: 600, tipo: "P", frequencia: "mensal", dia: 10, mes_anual: null, forma: "Debito", ativo: true },
    { id: "g3", categoria: "Telefonia", descricao: "Internet", valor: 119.90, tipo: "A", frequencia: "mensal", dia: 15, mes_anual: null, forma: "Boleto", ativo: true },
    { id: "g4", categoria: "Saude", descricao: "Plano de saúde", valor: 349.90, tipo: "A", frequencia: "mensal", dia: 20, mes_anual: null, forma: "Boleto", ativo: true },
    { id: "g5", categoria: "Transporte", descricao: "Gasolina", valor: 250, tipo: "P", frequencia: "mensal", dia: 8, mes_anual: null, forma: "Cartao", ativo: true },
    { id: "g6", categoria: "Lazer", descricao: "Streaming", valor: 49.90, tipo: "A", frequencia: "mensal", dia: 12, mes_anual: null, forma: "Cartao", ativo: true },
    { id: "g7", categoria: "Educacao", descricao: "Curso online", valor: 39.90, tipo: "A", frequencia: "mensal", dia: 1, mes_anual: null, forma: "Cartao", ativo: true },
    { id: "g8", categoria: "Imposto", descricao: "IPTU", valor: 3600, tipo: "C", frequencia: "anual", dia: 15, mes_anual: 2, forma: "Pix", ativo: true },
    { id: "g9", categoria: "Telefonia", descricao: "Celular", valor: 79.90, tipo: "A", frequencia: "mensal", dia: 18, mes_anual: null, forma: "Boleto", ativo: true },
    { id: "g10", categoria: "Outros", descricao: "Seguro residencial", valor: 89.90, tipo: "A", frequencia: "mensal", dia: 25, mes_anual: null, forma: "Boleto", ativo: true },
    { id: "g11", categoria: "Alimentacao", descricao: "Restaurante", valor: 200, tipo: "P", frequencia: "mensal", dia: 7, mes_anual: null, forma: "Cartao", ativo: true },
  ]);

  seedIfEmpty("parcelas", [
    { id: "p1", data: "2026-01-15", descricao: "Notebook", valor_total: 4800, qtd_parcelas: 12, parcela_inicial: 1, cartao: "Cartão 1", categoria: "Tecnologia" },
    { id: "p2", data: "2026-03-01", descricao: "Sofá", valor_total: 2400, qtd_parcelas: 10, parcela_inicial: 1, cartao: "Cartão 2", categoria: "Casa" },
    { id: "p3", data: "2026-05-20", descricao: "Curso Data Science", valor_total: 1800, qtd_parcelas: 6, parcela_inicial: 1, cartao: "Cartão 1", categoria: "Educacao" },
  ]);

  seedIfEmpty("desejos", [
    { id: "d1", item: "iPhone 16", valor: 7999, tipo: "Tecnologia", parcelado: true, qtd_parcelas: 12 },
    { id: "d2", item: "Viagem Japão", valor: 15000, tipo: "Lazer", parcelado: false, qtd_parcelas: null },
    { id: "d3", item: "Mountain Bike", valor: 3500, tipo: "Lazer", parcelado: false, qtd_parcelas: null },
  ]);

  seedIfEmpty("caixinhas", [
    { id: "c1", nome: "Reserva de emergência", meta: 30000, atual: 12000, icone: "" },
    { id: "c2", nome: "Viagem dos sonhos", meta: 15000, atual: 3200, icone: "" },
  ]);

  seedIfEmpty("investimentos", [
    { id: "i1", nome: "CDB 100% CDI", tipo: "CDB", renda: "100% CDI", valor_aplicado: 5000, posicao_atual: 5342.50, data: "2025-06-01", vencimento: "2027-06-01" },
    { id: "i2", nome: "Fundo Imobiliário", tipo: "Fundo", renda: "10% a.a.", valor_aplicado: 3000, posicao_atual: 3270.80, data: "2025-08-15", vencimento: "" },
    { id: "i3", nome: "Tesouro Selic", tipo: "Tesouro", renda: "Selic", valor_aplicado: 8000, posicao_atual: 8420.00, data: "2025-01-10", vencimento: "2028-01-10" },
  ]);

  seedIfEmpty("tarefas", [
    { id: "t1", data: new Date().toISOString().slice(0, 10), descricao: "Pagar fatura do cartão", tipo: "Pagamento", status: "pendente", valor: 1250 },
    { id: "t2", data: new Date(Date.now() + 86400000).toISOString().slice(0, 10), descricao: "Transferir para reserva", tipo: "Economia", status: "pendente", valor: 500 },
    { id: "t3", data: new Date(Date.now() - 86400000).toISOString().slice(0, 10), descricao: "Revisar mensalidade streaming", tipo: "Verificar", status: "pendente", valor: 0 },
  ]);

  seedIfEmpty("focos_diarios", []);
  seedIfEmpty("pomodoros", []);
  seedIfEmpty("habitos", [
    { id: "h1", nome: "Exercício", icone: "", ativo: true },
    { id: "h2", nome: "Leitura", icone: "", ativo: true },
  ]);
  seedIfEmpty("habitos_registros", []);

  // Mark seeded so subsequent loads skip redundant checks
  if (typeof window !== "undefined") {
    try { localStorage.setItem(SEEDED_KEY, "1"); } catch {}
  }
}
