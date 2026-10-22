import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./utils";

const alertVariants = cva(
  "relative w-full rounded-xl border px-4 py-3 text-sm grid has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr] grid-cols-[0_1fr] has-[>svg]:gap-x-3 gap-y-0.5 items-start [&>svg]:size-4 [&>svg]:translate-y-0.5 [&>svg]:text-current shadow-2xs",
  {
    variants: {
      variant: {
        default: "bg-card text-card-foreground border-border/80",
        destructive:
          "text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/50 [&>svg]:text-rose-600 dark:[&>svg]:text-rose-400 *:data-[slot=alert-description]:text-rose-600 dark:*:data-[slot=alert-description]:text-rose-300/90",
        warning:
          "text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/50 [&>svg]:text-amber-600 dark:[&>svg]:text-amber-400 *:data-[slot=alert-description]:text-amber-700 dark:*:data-[slot=alert-description]:text-amber-300/90",
        info:
          "text-blue-800 dark:text-blue-200 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900/50 [&>svg]:text-blue-600 dark:[&>svg]:text-blue-400 *:data-[slot=alert-description]:text-blue-700 dark:*:data-[slot=alert-description]:text-blue-300/90",
        success:
          "text-emerald-800 dark:text-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/50 [&>svg]:text-emerald-600 dark:[&>svg]:text-emerald-400 *:data-[slot=alert-description]:text-emerald-700 dark:*:data-[slot=alert-description]:text-emerald-300/90",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  );
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn(
        "col-start-2 line-clamp-1 min-h-4 font-medium tracking-tight",
        className,
      )}
      {...props}
    />
  );
}

function AlertDescription({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        "text-muted-foreground col-start-2 grid justify-items-start gap-1 text-sm [&_p]:leading-relaxed",
        className,
      )}
      {...props}
    />
  );
}

export { Alert, AlertTitle, AlertDescription };
