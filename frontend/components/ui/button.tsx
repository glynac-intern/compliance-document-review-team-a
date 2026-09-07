import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950 disabled:pointer-events-none disabled:opacity-50 select-none",
  {
    variants: {
      variant: {
        default:
          "bg-[#1e4c77] text-white shadow-xs hover:bg-[#163e63] active:bg-[#112f4c] focus-visible:ring-[#2575bc]",
        destructive:
          "bg-rose-700 text-slate-50 shadow-xs hover:bg-rose-700/90 active:bg-rose-800",
        outline:
          "border border-slate-200 bg-white shadow-xs hover:bg-slate-100 hover:text-slate-900",
        secondary:
          "bg-slate-100 text-slate-900 shadow-xs hover:bg-slate-200/80 active:bg-slate-200",
        ghost: "hover:bg-slate-100 hover:text-slate-900",
        link: "text-slate-900 underline-offset-4 hover:underline",
        success:
          "bg-emerald-700 text-white shadow-xs hover:bg-emerald-700/90 active:bg-emerald-800",
        warning:
          "bg-amber-600 text-white shadow-xs hover:bg-amber-600/90 active:bg-amber-700",
      },
      size: {
        default: "h-8 px-3 py-1.5",
        xs: "h-6 rounded px-2 text-[11px]",
        sm: "h-7 rounded-md px-2.5 text-xs",
        lg: "h-9 rounded-md px-4 text-sm",
        icon: "h-8 w-8",
        "icon-sm": "h-7 w-7",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
