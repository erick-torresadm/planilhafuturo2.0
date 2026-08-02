import { useState, type ReactNode } from "react";
import { LayoutGrid, Table as TableIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Mode = "cards" | "table";

export function DataView({
  cards, table, storageKey,
}: {
  cards: ReactNode;
  table: ReactNode;
  storageKey?: string;
}) {
  const [mode, setMode] = useState<Mode>(() => {
    const saved = storageKey
      ? (typeof window !== "undefined" ? localStorage.getItem(storageKey) : null)
      : null;
    if (saved === "cards" || saved === "table") return saved;
    return "cards";
  });

  function set(m: Mode) {
    setMode(m);
    if (storageKey) localStorage.setItem(storageKey, m);
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <div className="inline-flex rounded-lg bg-muted p-0.5 border border-border">
          <button
            onClick={() => set("cards")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all",
              mode === "cards" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <LayoutGrid className="h-3.5 w-3.5" /> Cards
          </button>
          <button
            onClick={() => set("table")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all",
              mode === "table" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <TableIcon className="h-3.5 w-3.5" /> Tabela
          </button>
        </div>
      </div>
      <div className="anim-fade-up">{mode === "cards" ? cards : table}</div>
    </div>
  );
}
