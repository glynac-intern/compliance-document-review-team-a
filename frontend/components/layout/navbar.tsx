"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, ChevronRight } from "lucide-react";

export function Navbar() {
  const pathname = usePathname();

  const getBreadcrumbs = () => {
    if (pathname.startsWith("/officer/review")) {
      return [
        { label: "Queue", href: "/officer" },
        { label: "Review", current: true },
      ];
    }
    if (pathname.startsWith("/officer")) {
      return [{ label: "Review Queue", current: true }];
    }
    if (pathname.startsWith("/advisor/document")) {
      return [
        { label: "Submissions", href: "/advisor" },
        { label: "Document", current: true },
      ];
    }
    return [{ label: "Submissions", current: true }];
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <header className="h-11 border-b border-slate-200 bg-white px-4 flex items-center justify-between shrink-0 sticky top-0 z-30">
      <nav className="flex items-center gap-1 text-[13px] text-slate-500">
        {breadcrumbs.map((crumb, idx) => (
          <React.Fragment key={idx}>
            {idx > 0 && <ChevronRight className="h-3 w-3 text-slate-300" />}
            {crumb.current ? (
              <span className="font-medium text-slate-900">{crumb.label}</span>
            ) : (
              <Link href={crumb.href!} className="hover:text-slate-700">
                {crumb.label}
              </Link>
            )}
          </React.Fragment>
        ))}
      </nav>

      <div className="flex items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2 top-1.5 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search..."
            className="h-7 w-52 rounded-md border border-slate-200 bg-slate-50 pl-7 pr-2 text-[12px] placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-300"
          />
        </div>
      </div>
    </header>
  );
}
