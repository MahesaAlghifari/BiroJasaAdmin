import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./utils";
import { 
  getStatusBadgeClass, 
  STATUS_STYLES, 
  BUSINESS_STATUS_MAP, 
  formatBadgeText,
  type StatusSemantic 
} from "./status-config";

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-md border h-5 px-2 py-0 text-[11px] leading-none font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "border-slate-200 dark:border-slate-700/60 bg-slate-100 dark:bg-slate-800/60 text-slate-700 dark:text-slate-200",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground",
        destructive:
          "border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300",
        outline:
          "border-border bg-transparent text-foreground [a&]:hover:bg-accent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.ComponentProps<"span">,
    VariantProps<typeof badgeVariants> {
  asChild?: boolean;
  status?: string | number;
}

function formatBadgeChildren(children: React.ReactNode): React.ReactNode {
  if (typeof children === "string") {
    return formatBadgeText(children);
  }
  if (Array.isArray(children)) {
    return React.Children.map(children, (child) => formatBadgeChildren(child));
  }
  if (React.isValidElement(children)) {
    const childProps = children.props as any;
    if (childProps && childProps.children) {
      return React.cloneElement(children as React.ReactElement<any>, {
        ...childProps,
        children: formatBadgeChildren(childProps.children),
      });
    }
  }
  return children;
}

function Badge({
  className,
  variant,
  status,
  asChild = false,
  children,
  ...props
}: BadgeProps) {
  const Comp = asChild ? Slot : "span";
  const isStatusBadge = status !== undefined && status !== null;
  const statusClass = isStatusBadge ? getStatusBadgeClass(status) : "";
  const resolvedVariant = isStatusBadge && !variant ? undefined : variant;

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant: resolvedVariant }), statusClass, className)}
      {...props}
    >
      {asChild ? children : formatBadgeChildren(children)}
    </Comp>
  );
}

export { Badge, badgeVariants, getStatusBadgeClass, STATUS_STYLES, BUSINESS_STATUS_MAP, formatBadgeText };
export type { StatusSemantic };
