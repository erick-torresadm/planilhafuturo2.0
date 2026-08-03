import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getActiveWorkspace, setActiveWorkspace } from "@/lib/workspace";
import { cn } from "@/lib/utils";
import { Check, ChevronDown, User, Users } from "lucide-react";

type Workspace = { ownerId: string; ownerNome: string };

export function WorkspaceSwitcher() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  // Server fn segura: só retorna id+nome dos donos em que somos membros.
  // Não lê profiles de terceiros pela RLS (evita vazar email/dados do dono).
  const { data: workspaces = [] } = useQuery({
    queryKey: ["workspaces"],
    queryFn: async (): Promise<Workspace[]> => {
      const m = await import("@/lib/assinatura.functions");
      const list = await m.getMemberWorkspaces();
      return list.map((w) => ({ ownerId: w.ownerId, ownerNome: w.ownerNome }));
    },
    retry: false,
  });

  const active = getActiveWorkspace();

  // Se o workspace salvo deixou de ser válido (removido pelo owner), limpa.
  useEffect(() => {
    if (active && workspaces.length > 0 && !workspaces.some((w) => w.ownerId === active)) {
      setActiveWorkspace(null);
      qc.invalidateQueries();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, workspaces]);

  function switchTo(ownerId: string | null) {
    setActiveWorkspace(ownerId);
    setOpen(false);
    qc.invalidateQueries();
  }

  const current = active ? workspaces.find((w) => w.ownerId === active) : null;
  const label = current ? current.ownerNome : "Minha conta";

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 w-full px-3 py-2 rounded-lg border border-border bg-background hover:bg-muted transition-colors"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={cn(
          "h-6 w-6 rounded-md grid place-items-center shrink-0",
          current ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
        )}>
          {current ? <Users className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
        </span>
        <span className="text-xs font-semibold truncate flex-1 text-left">
          {label}
        </span>
        <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground shrink-0 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute z-50 mt-1 inset-x-0 rounded-lg border border-border bg-card shadow-lg overflow-hidden">
            <p className="eyebrow px-3 pt-2.5 pb-1">Alternar para</p>
            {workspaces.map((w) => (
              <button
                key={w.ownerId}
                onClick={() => switchTo(w.ownerId)}
                className={cn(
                  "flex items-center gap-2 w-full px-3 py-2.5 text-sm hover:bg-muted transition-colors",
                  active === w.ownerId && "text-primary",
                )}
              >
                <Users className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate flex-1 text-left">{w.ownerNome}</span>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Workspace</span>
                {active === w.ownerId && <Check className="h-4 w-4 shrink-0" />}
              </button>
            ))}
            <button
              onClick={() => switchTo(null)}
              className={cn(
                "flex items-center gap-2 w-full px-3 py-2.5 text-sm border-t border-border hover:bg-muted transition-colors",
                !active && "text-primary",
              )}
            >
              <User className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="truncate flex-1 text-left">Minha conta</span>
              {!active && <Check className="h-4 w-4 shrink-0" />}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
