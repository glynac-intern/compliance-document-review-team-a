"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface MetricCardsProps {
  total: number;
  pending: number;
  approved: number;
  needsRevision: number;
  activeFilter: string;
  onSelectFilter: (filterKey: string) => void;
}

export function MetricCards({
  total,
  pending,
  approved,
  needsRevision,
  activeFilter,
  onSelectFilter,
}: MetricCardsProps) {
  // Simple, clean cards with existing background gradients, CamelCase top text, and small-case minimal bottom text
  const cards = [
    {
      id: "all",
      label: "Total Submissions",
      value: String(total).padStart(2, "0"),
      gradient: "from-[#1b4a74] via-[#215e96] to-[#163f64]",
      hoverGradient: "hover:from-[#20588a] hover:via-[#276eaf] hover:to-[#1a4975]",
    },
    {
      id: "pending",
      label: "Pending Review",
      value: String(pending).padStart(2, "0"),
      gradient: "from-[#1a4872] via-[#205b92] to-[#153e63]",
      hoverGradient: "hover:from-[#1f5688] hover:via-[#256aab] hover:to-[#194772]",
    },
    {
      id: "approved",
      label: "Approved",
      value: String(approved).padStart(2, "0"),
      gradient: "from-[#18456e] via-[#1e578c] to-[#143a5d]",
      hoverGradient: "hover:from-[#1d5283] hover:via-[#2365a3] hover:to-[#17436b]",
    },
    {
      id: "needs_revision",
      label: "Needs Revision",
      value: String(needsRevision).padStart(2, "0"),
      gradient: "from-[#1e4c77] via-[#24619a] to-[#18446c]",
      hoverGradient: "hover:from-[#225a8c] hover:via-[#2871b3] hover:to-[#1b4b77]",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 select-none font-inter">
      {cards.map((card) => {
        const isActive = activeFilter === card.id;

        return (
          <button
            key={card.id}
            type="button"
            onClick={() => onSelectFilter(card.id)}
            className={cn(
              "group relative text-left p-5 sm:p-5.5 rounded-2xl bg-gradient-to-br transition-all duration-200 ease-out cursor-pointer overflow-hidden border border-white/10",
              card.gradient,
              card.hoverGradient,
              // Clickable hover behavior
              "hover:-translate-y-0.5 hover:border-white/30 hover:shadow-lg shadow-sm",
              "active:scale-[0.98]",
              isActive && "ring-2 ring-white/80 ring-offset-2 ring-offset-[#f8fafc]"
            )}
          >
            {/* Top text: Non-bold elegant Inter font */}
            <p className="font-inter text-xs sm:text-[13px] font-normal text-blue-100/90 tracking-normal">
              {card.label}
            </p>

            {/* Number font: Geometric Sans-Serif font (ONLY FOR NUMBERS) */}
            <p className="font-numbers font-geometric text-3xl sm:text-4xl lg:text-[40px] font-bold sm:font-extrabold text-white tracking-tight tabular-nums mt-1.5 leading-none">
              {card.value}
            </p>
          </button>
        );
      })}
    </div>
  );
}
