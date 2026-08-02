import { useRef, useState } from "react";
import { brl, num } from "@/lib/format";
import { cn } from "@/lib/utils";
import { usePrivacy, DOTS } from "@/lib/privacy";

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
  const cancelled = useRef(false);
  const committed = useRef(false);
  const { hidden } = usePrivacy();

  function open() {
    cancelled.current = false;
    committed.current = false;
    setDraft(value ? String(value).replace(".", ",") : "");
    setEditing(true);
    // Focus on next tick so the input is rendered
    requestAnimationFrame(() => {
      ref.current?.focus();
      ref.current?.select();
    });
  }

  function commit() {
    if (committed.current) return;
    if (cancelled.current) { setEditing(false); return; }
    committed.current = true;
    const n = num(draft);
    setEditing(false);
    if (n !== value) onCommit(n);
  }

  function cancel() {
    cancelled.current = true;
    setEditing(false);
  }

  if (readOnly) {
    return (
      <div className={cn("px-2 py-1 h-full flex items-center text-sm tabular-nums", align === "right" && "justify-end", className)}>
        {hidden ? DOTS : value ? brl(value) : <span className="text-muted-foreground/50">—</span>}
      </div>
    );
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={open}
        className={cn(
          "px-2 py-1 h-full w-full text-left flex items-center tabular-nums text-sm hover:bg-primary/5 focus:outline-none focus:ring-2 focus:ring-primary/40",
          "touch-manipulation",
          align === "right" && "justify-end",
          className,
        )}
      >
        {hidden ? DOTS : value ? brl(value) : <span className="text-muted-foreground/40">{placeholder || "—"}</span>}
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
        if (e.key === "Escape") { cancel(); }
      }}
      inputMode="decimal"
      spellCheck={false}
      autoComplete="off"
      className={cn(
        "px-2 py-1 h-full w-full bg-primary/5 border-2 border-primary focus:outline-none tabular-nums font-mono",
        "text-sm sm:text-sm text-[16px]", // 16px on mobile prevents iOS zoom on focus
        "touch-manipulation",
        align === "right" && "text-right",
      )}
    />
  );
}
