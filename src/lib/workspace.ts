/**
 * Estado de workspace ativo.
 *
 * O dono da conta usa "Minha conta" (activeOwnerId = null). Um ADM convidado
 * pode alternar para o workspace do dono (activeOwnerId = id do dono), fazendo
 * com que todas as queries de DADOS (supabase-db.ts getUserId) passem a ler/
 * escrever nas linhas do dono. O perfil (getProfile/updateProfile) sempre usa a
 * sessão — não é afetado.
 */

const KEY = "planilhafuturo_active_ws";

let activeOwnerId: string | null =
  typeof window !== "undefined" ? localStorage.getItem(KEY) : null;

export function getActiveWorkspace(): string | null {
  return activeOwnerId;
}

export function setActiveWorkspace(id: string | null) {
  activeOwnerId = id;
  if (typeof window === "undefined") return;
  if (id) {
    localStorage.setItem(KEY, id);
  } else {
    localStorage.removeItem(KEY);
  }
}
