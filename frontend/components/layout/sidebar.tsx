"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FileText,
  CheckSquare,
  Settings,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { VerityLogo } from "@/components/ui/verity-logo";

export function Sidebar() {
  const pathname = usePathname();
  const isOfficer = pathname.startsWith("/officer");

  const navItems = isOfficer
    ? [
        { label: "Queue", href: "/officer", icon: CheckSquare },
      ]
    : [
        { label: "Submissions", href: "/advisor", icon: FileText },
      ];

  return (
    <aside className="w-[200px] shrink-0 border-r border-slate-200 bg-white flex flex-col justify-between h-screen sticky top-0 select-none">
      <div>
        {/* Brand */}
        <div className="h-12 border-b border-slate-200 px-3 flex items-center">
          <VerityLogo
            size={20}
            markClassName="text-[#2575bc]"
            wordmarkClassName="text-slate-900 text-[13px] tracking-[0.16em]"
          />
        </div>

        {/* Nav */}
        <nav className="p-2 space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 rounded-md px-2 py-1.5 text-[13px] font-medium transition-colors",
                  active
                    ? "bg-[#ebf4fb] text-[#1e4c77] font-semibold"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <Icon className={cn("h-4 w-4", active ? "text-[#2575bc]" : "text-slate-400")} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer — user + workspace switch */}
      <div className="border-t border-slate-200 p-2 space-y-2">
        {/* Workspace switch */}
        <div className="flex gap-1 bg-slate-100 p-0.5 rounded-md">
          <Link
            href="/advisor"
            className={cn(
              "flex-1 text-center rounded text-[11px] font-medium py-1 transition-colors",
              !isOfficer ? "bg-white text-[#1e4c77] shadow-xs font-semibold" : "text-slate-500 hover:text-slate-700"
            )}
          >
            Advisor
          </Link>
          <Link
            href="/officer"
            className={cn(
              "flex-1 text-center rounded text-[11px] font-medium py-1 transition-colors",
              isOfficer ? "bg-white text-[#1e4c77] shadow-xs font-semibold" : "text-slate-500 hover:text-slate-700"
            )}
          >
            Officer
          </Link>
        </div>

        {/* User */}
        <div className="flex items-center gap-2 px-1">
          <div className="h-6 w-6 rounded-full bg-slate-200 text-slate-600 text-[10px] font-semibold flex items-center justify-center shrink-0">
            {isOfficer ? "SJ" : "JA"}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[12px] font-medium text-slate-800 truncate">
              {isOfficer ? "S. Jenkins" : "J. Adams"}
            </div>
            <div className="text-[10px] text-slate-400 leading-none">
              {isOfficer ? "Officer" : "Advisor"}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
