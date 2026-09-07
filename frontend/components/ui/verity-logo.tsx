import * as React from "react";
import { cn } from "@/lib/utils";

interface VerityLogoProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: number | string;
  showWordmark?: boolean;
  wordmarkClassName?: string;
  markClassName?: string;
}

export function VerityMark({
  className,
  size = 28,
  ...props
}: React.SVGProps<SVGSVGElement> & { size?: number | string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
      aria-label="Verity Trademark Mark"
      {...props}
    >
      {/* Outer circular ring with clean gap in upper right (approx 1:00 to 2:00) */}
      <path
        d="M 82.7 32.6 A 37 37 0 1 1 67.4 17.3"
        stroke="currentColor"
        strokeWidth="7.6"
        strokeLinecap="butt"
      />
      {/* Center solid circular dot */}
      <circle cx="50" cy="50" r="9.5" fill="currentColor" />
    </svg>
  );
}

export function VerityLogo({
  className,
  size = 26,
  showWordmark = true,
  wordmarkClassName,
  markClassName,
  ...props
}: VerityLogoProps) {
  return (
    <div className={cn("inline-flex items-center gap-2.5 select-none", className)} {...props}>
      <VerityMark size={size} className={markClassName} />
      {showWordmark && (
        <span
          className={cn(
            "font-extrabold tracking-[0.2em] uppercase text-[15px] leading-none font-sans",
            wordmarkClassName
          )}
        >
          VERITY
        </span>
      )}
    </div>
  );
}
