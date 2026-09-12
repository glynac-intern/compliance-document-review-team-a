"use client";

/**
 * TA-61: Unauthenticated visitors are redirected to login. Advisor-only
 * and officer-only areas are routed by role -- an authenticated user
 * with the wrong role gets sent to THEIR correct dashboard, not left
 * on a page that isn't theirs.
 *
 * Usage, at the top of a protected page component:
 *   const { isReady } = useRequireAuth("advisor");
 *   if (!isReady) return null; // or a loading skeleton
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./auth-context";
import type { UserRole } from "./api-client";

export function useRequireAuth(requiredRole?: UserRole): { isReady: boolean } {
  const router = useRouter();
  const { token, role, isLoading } = useAuth();
  const [isReady, setIsReady] = React.useState(false);

  React.useEffect(() => {
    if (isLoading) return; // wait for localStorage hydration first

    if (!token) {
      router.replace("/login");
      return;
    }

    if (requiredRole && role !== requiredRole) {
      // Authenticated, but wrong area -- send them to their OWN
      // correct dashboard rather than leaving them on a page that
      // isn't theirs.
      router.replace(role === "officer" ? "/officer" : "/advisor");
      return;
    }

    setIsReady(true);
  }, [isLoading, token, role, requiredRole, router]);

  return { isReady };
}
