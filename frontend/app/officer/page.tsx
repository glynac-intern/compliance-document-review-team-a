"use client";

/**
 * TA-61: minimal stub -- exists so role-based route protection can be
 * genuinely tested end to end (an advisor visiting this URL should be
 * redirected to /advisor, not left here or 404'd). The REAL officer
 * dashboard UI is separate, later work, not part of this ticket's
 * scope (client/session/routing infrastructure).
 */

import { useRequireAuth } from "@/lib/use-require-auth";
import { useAuth } from "@/lib/auth-context";

export default function OfficerDashboardPage() {
  const { isReady } = useRequireAuth("officer");
  const { logout } = useAuth();

  if (!isReady) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Officer Dashboard</h1>
        <p className="text-slate-500 mb-6">
          Placeholder -- the real review queue UI is separate work.
        </p>
        <button
          onClick={logout}
          className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium"
        >
          Log out
        </button>
      </div>
    </div>
  );
}
