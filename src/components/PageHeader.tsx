import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type Props = {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  eyebrow?: string;
  className?: string;
};

export function PageHeader({ title, subtitle, actions, eyebrow, className }: Props) {
  return (
    <div className={cn("grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 pb-4 border-b border-border", className)}>
      <div className="min-w-0">
        {eyebrow && <div className="eyebrow mb-1">{eyebrow}</div>}
        <h1 className="font-display text-xl sm:text-2xl font-semibold tracking-tight truncate">{title}</h1>
        {subtitle && <p className="text-[13px] text-muted-foreground mt-0.5 truncate">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

export function PageBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("px-4 sm:px-6 py-5 sm:py-6 max-w-7xl mx-auto space-y-5", className)}>{children}</div>;
}
