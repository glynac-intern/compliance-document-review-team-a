/**
 * Centralized error classification and diagnostic logging for Verity UI.
 *
 * Requirements:
 * - "Data unavailable" — for failed or invalid responses (HTTP 4xx, invalid JSON/schema).
 * - "Request timed out. Please try again." — for timeouts (HTTP 408/504, AbortError, TimeoutError).
 * - "Unable to load this information. Please refresh or try again later." — for unexpected server or network errors (HTTP 5xx, network offline).
 * - "No data available yet." — only when the backend successfully returns an empty result.
 */

import { ApiError } from "./api-client";

export type StandardErrorMessage =
  | "Data unavailable"
  | "Request timed out. Please try again."
  | "Unable to load this information. Please refresh or try again later.";

export const STANDARD_EMPTY_MESSAGE = "No data available yet.";

/**
 * Classifies an error into one of the 3 required professional UI messages.
 */
export function classifyError(error: unknown): StandardErrorMessage {
  if (!error) {
    return "Unable to load this information. Please refresh or try again later.";
  }

  // Timeout detection
  if (
    (error instanceof DOMException && (error.name === "TimeoutError" || error.name === "AbortError")) ||
    (error instanceof Error &&
      (error.name === "TimeoutError" ||
        error.name === "AbortError" ||
        error.message.toLowerCase().includes("timeout") ||
        error.message.toLowerCase().includes("timed out")))
  ) {
    return "Request timed out. Please try again.";
  }

  if (error instanceof ApiError) {
    if (error.status === 408 || error.status === 504) {
      return "Request timed out. Please try again.";
    }
    // Failed client request or invalid parameters / not found
    if (error.status >= 400 && error.status < 500) {
      return "Data unavailable";
    }
    // Server errors (500, 502, 503) or network drop (status 0)
    return "Unable to load this information. Please refresh or try again later.";
  }

  if (error instanceof TypeError && error.message.toLowerCase().includes("fetch")) {
    return "Unable to load this information. Please refresh or try again later.";
  }

  return "Unable to load this information. Please refresh or try again later.";
}

/**
 * Logs comprehensive diagnostic error detail for developers without leaking
 * technical details to users.
 */
export function logDiagnosticError(context: string, error: unknown): void {
  const timestamp = new Date().toISOString();
  if (error instanceof ApiError) {
    console.error(`[Verity Diagnostic] ${timestamp} [${context}] ApiError status=${error.status}: ${error.message}`);
  } else if (error instanceof Error) {
    console.error(`[Verity Diagnostic] ${timestamp} [${context}] ${error.name}: ${error.message}\nStack: ${error.stack}`);
  } else {
    console.error(`[Verity Diagnostic] ${timestamp} [${context}] Unknown error:`, error);
  }
}
