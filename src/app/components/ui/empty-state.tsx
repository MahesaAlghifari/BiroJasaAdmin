import * as React from "react";
import { LucideIcon, FileQuestion } from "lucide-react";
import { cn } from "./utils";

export interface EmptyStateProps extends React.ComponentProps<"div"> {
  icon?: LucideIcon | React.ComponentType<{ className?: string }>;
  title?: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({
  icon: Icon = FileQuestion,
  title = "Tidak ada data ditemukan",
  description,
  action,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      data-slot="empty-state"
      className={cn(
        "flex flex-col items-center justify-center text-center p-8 sm:p-12 gap-3 min-h-[200px] w-full",
        className
      )}
      {...props}
    >
      <div className="w-12 h-12 rounded-xl bg-muted/60 border border-border/60 flex items-center justify-center text-muted-foreground/70 shrink-0">
        <Icon className="w-6 h-6" />
      </div>
      <div className="space-y-1 max-w-sm">
        <h4 className="text-sm font-semibold text-foreground tracking-tight">{title}</h4>
        {description && (
          <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
        )}
      </div>
      {action && <div className="mt-2 shrink-0">{action}</div>}
    </div>
  );
}
