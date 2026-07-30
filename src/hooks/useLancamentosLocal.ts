import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { selectAll, insertRow, updateRow, deleteRow } from "@/lib/db";
import type { Lancamento } from "@/lib/finance";

export function useLancamentosLocal() {
  const qc = useQueryClient();

  const { data: list = [] } = useQuery<Lancamento[]>({
    queryKey: ["lancamentos"],
    queryFn: () => selectAll<Lancamento>("lancamentos"),
  });

  const { mutate: upsert } = useMutation({
    mutationFn: async ({ data, tipo, valor }: { data: string; tipo: string; valor: number }) => {
      const existing = list.find((l) => l.data === data && l.tipo === tipo);
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
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lancamentos"] }),
  });

  return { list, upsert };
}
