"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";

import { cn } from "./utils";

function Tabs({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  );
}

function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        "bg-muted text-muted-foreground inline-flex h-9 w-fit items-center justify-center rounded-xl p-[3px] flex",
        className,
      )}
      {...props}
    />
  );
}

/**
 * Shared tab visual-state system (Phase 8.3).
 *
 * State is read exclusively from Radix attributes (`data-state`, `disabled`),
 * so whichever source drives `value` (URL params, local state) stays the
 * single source of truth — this component never owns selection state.
 *
 * - INACTIVE: muted foreground at full opacity (AA contrast) — interactive, not disabled.
 * - HOVER: inactive-only neutral tint + foreground text; never adopts active cues.
 * - ACTIVE: elevated card surface + border + primary text + bottom indicator bar.
 *   The surface/border/indicator give a shape cue, so selection is not colour-only.
 * - FOCUS-VISIBLE: ring-coloured border + 3px halo (same pattern as Button);
 *   `outline-hidden` keeps a transparent outline for Windows forced-colours mode.
 * - DISABLED: 50% opacity + no pointer events; indicator suppressed.
 * Font weight is constant across states to avoid label width jitter.
 */
const tabsTriggerStateClasses = [
  // Layout (unchanged from the previous primitive)
  "relative inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-xl border border-transparent px-2 py-1 text-sm font-medium whitespace-nowrap",
  "transition-[color,background-color,border-color,box-shadow]",
  "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  // Inactive
  "text-muted-foreground",
  // Hover (inactive only)
  "data-[state=inactive]:hover:text-foreground data-[state=inactive]:hover:bg-foreground/5",
  // Active (Phase 8.5: Solid blue background + white text, no bottom/inline indicator)
  "data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-xs",
  "dark:data-[state=active]:bg-primary dark:data-[state=active]:text-white dark:data-[state=active]:shadow-none",
  // Focus-visible
  "focus-visible:outline-hidden focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
  // Active tab focus-visible ring
  "data-[state=active]:focus-visible:ring-primary/40",
  // Disabled
  "disabled:pointer-events-none disabled:opacity-50",
];

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(...tabsTriggerStateClasses, className)}
      {...props}
    />
  );
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("flex-1 outline-none", className)}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
