import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { selectAll, insertRow, updateRow, deleteRow } from "@/lib/db";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Lancamento } from "@/lib/finance";

export function useLancamentosLocal() {
  const qc = useQueryClient();

  const { data: list = [] } = useQuery<Lancamento[]>({
    queryKey: ["lancamentos"],
    queryFn: () => selectAll<Lancamento>("lancamentos"),
  });

  const { mutate: upsert } = useMutation({
    mutationFn: async ({ data, tipo, valor }: { data: string; tipo: string; valor: number }) => {
      const userId = await getCurrentUserId();
      if (!userId) {
        toast.error("Faça login para registrar lançamentos");
        throw new Error("Usuário não autenticado");
      }

      const existing = list.find((l) => l.data === data && l.tipo === tipo && l.user_id === userId);
      if (existing) {
        if (valor === 0) {
          await deleteRow("lancamentos", existing.id);
          return;
        }
        await updateRow("lancamentos", existing.id, { valor });
        return;
      }
      if (valor === 0) return;
      await insertRow("lancamentos", {
        id: crypto.randomUUID(),
        data,
        tipo: tipo as Lancamento["tipo"],
        valor,
        user_id: userId,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lancamentos"] }),
    onError: (err: any) => {
      toast.error(err.message || "Erro ao salvar lançamento");
    },
  });

  // Helper to get current user ID
  async function getCurrentUserId(): Promise<string | null> {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user?.id ?? null;
  }

  return { list, upsert };
}
