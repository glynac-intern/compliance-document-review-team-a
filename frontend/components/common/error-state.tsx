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
}

export function ErrorState({
  title = "Analysis Error",
  message,
  onRetry,
  isRetrying = false,
  className,
  compact = false,
}: ErrorStateProps) {
  if (compact) {
    return (
      <div
        className={cn(
          "flex items-center justify-between rounded-md border border-rose-200 bg-rose-50/70 px-3 py-2 text-xs text-rose-900",
          className
        )}
      >
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
          <span className="font-medium">{message}</span>
        </div>
        {onRetry && (
          <Button
            size="xs"
            variant="outline"
            onClick={onRetry}
            disabled={isRetrying}
            className="border-rose-300 text-rose-800 hover:bg-rose-100 h-6 px-2"
          >
            <RefreshCw className={cn("mr-1 h-3 w-3", isRetrying && "animate-spin")} />
            Retry
          </Button>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border border-rose-200 bg-rose-50/40 p-6 text-center",
        className
      )}
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-rose-100 text-rose-600 mb-2.5">
        <AlertCircle className="h-4 w-4" />
      </div>
      <h4 className="text-xs font-semibold text-rose-950 mb-1">{title}</h4>
      <p className="max-w-sm text-xs text-rose-700/90 mb-3">{message}</p>
      {onRetry && (
        <Button
          size="sm"
          variant="outline"
          onClick={onRetry}
          disabled={isRetrying}
          className="border-rose-300 text-rose-900 hover:bg-rose-100"
        >
          <RefreshCw className={cn("mr-1.5 h-3.5 w-3.5", isRetrying && "animate-spin")} />
          {isRetrying ? "Retrying..." : "Retry Analysis"}
        </Button>
      )}
    </div>
  );
}
