import { useEffect, useRef, useState } from "react";
import { brl, num } from "@/lib/format";
import { cn } from "@/lib/utils";

type Props = {
  value: number;
  onCommit: (v: number) => void;
  className?: string;
  readOnly?: boolean;
  align?: "left" | "right";
  placeholder?: string;
};

export function SheetCell({ value, onCommit, className, readOnly, align = "right", placeholder }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string>("");
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      ref.current?.focus();
      ref.current?.select();
    }
  }, [editing]);

  function commit() {
    const n = num(draft);
    setEditing(false);
    if (n !== value) onCommit(n);
  }

  if (readOnly) {
    return (
      <div className={cn("px-2 py-1 h-full flex items-center text-[13px] tabular-nums", align === "right" && "justify-end", className)}>
        {value ? brl(value) : <span className="text-muted-foreground/50">—</span>}
      </div>
    );
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => { setDraft(value ? String(value).replace(".", ",") : ""); setEditing(true); }}
        onFocus={() => { setDraft(value ? String(value).replace(".", ",") : ""); setEditing(true); }}
        className={cn(
          "px-2 py-1 h-full w-full text-left flex items-center tabular-nums text-[13px] hover:bg-primary/5 focus:outline-none focus:ring-2 focus:ring-primary/40",
          align === "right" && "justify-end",
          className,
        )}
      >
        {value ? brl(value) : <span className="text-muted-foreground/40">{placeholder || "—"}</span>}
      </button>
    );
  }

  return (
    <input
      ref={ref}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") { e.preventDefault(); commit(); }
        if (e.key === "Escape") { setEditing(false); }
      }}
      inputMode="decimal"
      spellCheck={false}
      className={cn(
        "px-2 py-1 h-full w-full bg-cell-edit border-2 border-primary focus:outline-none text-[13px] tabular-nums font-mono",
        align === "right" && "text-right",
      )}
    />
  );
}
