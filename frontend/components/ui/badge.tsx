import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium transition-colors focus:outline-none focus:ring-1 focus:ring-slate-950",
  {
    variants: {
      variant: {
        default: "bg-slate-900 text-slate-50",
        secondary: "bg-slate-100 text-slate-800 border border-slate-200",
        destructive: "bg-rose-50 text-rose-700 border border-rose-200",
        outline: "text-slate-700 border border-slate-200 bg-white",
        muted: "bg-slate-50 text-slate-600 border border-slate-200",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
