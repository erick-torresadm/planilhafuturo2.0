import { cn } from "@/lib/utils";
import { type LucideIcon, Inbox } from "lucide-react";
import type { ReactNode } from "react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-10 px-4", className)}>
      <div className="h-14 w-14 rounded-2xl bg-muted grid place-items-center mb-4">
        <Icon className="h-6 w-6 text-muted-foreground/60" strokeWidth={1.5} />
      </div>
      <h3 className="font-display text-base font-semibold text-foreground mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground text-center max-w-xs mb-4">{description}</p>
      )}
      {action && <div>{action}</div>}
    </div>
  );
}
