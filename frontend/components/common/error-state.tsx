import * as React from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  isRetrying?: boolean;
  className?: string;
  compact?: boolean;
  retryLabel?: string;
}

export function ErrorState({
  title,
  message,
  onRetry,
  isRetrying = false,
  className,
  compact = false,
  retryLabel = "Retry",
}: ErrorStateProps) {
  if (compact) {
    return (
      <div
        className={cn(
          "flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50/80 px-3.5 py-2.5 text-xs text-slate-700 font-inter shadow-2xs",
          className
        )}
      >
        <div className="flex items-center gap-2 min-w-0">
          <AlertCircle className="h-4 w-4 text-[#1e4c77] shrink-0" />
          <span className="font-normal truncate">{message}</span>
        </div>
        {onRetry && (
          <Button
            size="xs"
            variant="outline"
            onClick={onRetry}
            disabled={isRetrying}
            className="border-slate-200 bg-white text-[#1e4c77] hover:bg-slate-50 h-6 px-2.5 text-[11px] font-normal shrink-0 ml-2"
          >
            <RefreshCw className={cn("mr-1 h-3 w-3", isRetrying && "animate-spin")} />
            {retryLabel}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-8 text-center font-inter shadow-2xs",
        className
      )}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-[#1e4c77] mb-3 border border-slate-200/80">
        <AlertCircle className="h-5 w-5" />
      </div>
      {title && <h4 className="text-sm font-medium text-slate-900 mb-1">{title}</h4>}
      <p className="max-w-sm text-xs text-slate-600 mb-4">{message}</p>
      {onRetry && (
        <Button
          size="sm"
          variant="outline"
          onClick={onRetry}
          disabled={isRetrying}
          className="border-slate-200 bg-white text-[#1e4c77] hover:bg-slate-50 text-xs font-normal"
        >
          <RefreshCw className={cn("mr-1.5 h-3.5 w-3.5", isRetrying && "animate-spin")} />
          {isRetrying ? "Retrying..." : retryLabel}
        </Button>
      )}
    </div>
  );
}
