import { useEffect, useState, type ReactNode } from "react";
import { LayoutGrid, Table as TableIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Mode = "cards" | "table";

/**
 * DataView — mobile-first switcher between card list and table.
 * Defaults to cards on mobile, table on desktop.
 */
export function DataView({
  cards, table, storageKey,
}: {
  cards: ReactNode;
  table: ReactNode;
  storageKey?: string;
}) {
  const [mode, setMode] = useState<Mode>("cards");

  useEffect(() => {
    const saved = storageKey ? (localStorage.getItem(storageKey) as Mode | null) : null;
    if (saved === "cards" || saved === "table") {
      setMode(saved);
    } else if (typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches) {
      setMode("table");
    }
  }, [storageKey]);

  function set(m: Mode) {
    setMode(m);
    if (storageKey) localStorage.setItem(storageKey, m);
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <div className="inline-flex rounded-lg glass p-1">
          <button
            onClick={() => set("cards")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors",
              mode === "cards" ? "mint-gradient" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <LayoutGrid className="h-3.5 w-3.5" /> Cards
          </button>
          <button
            onClick={() => set("table")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors",
              mode === "table" ? "mint-gradient" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <TableIcon className="h-3.5 w-3.5" /> Tabela
          </button>
        </div>
      </div>
      <div className="fade-up">{mode === "cards" ? cards : table}</div>
    </div>
  );
}
