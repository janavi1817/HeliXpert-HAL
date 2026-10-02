"use client";

import React from "react";
import { DatasetSummary } from "@/lib/types";
import { Layers, Hash, Type, AlertCircle, HardDrive, BarChart3 } from "lucide-react";

interface OverviewCardsProps {
  summary: DatasetSummary;
}

const CARDS = (summary: DatasetSummary) => [
  {
    label: "Total Rows",
    value: summary.total_rows.toLocaleString(),
    sub: "Analytical records",
    icon: Layers,
    accent: "#8b5cf6",
  },
  {
    label: "Total Columns",
    value: summary.total_columns,
    sub: "Schema attributes",
    icon: BarChart3,
    accent: "#3b82f6",
  },
  {
    label: "Numeric Cols",
    value: summary.numeric_columns,
    sub: "Continuous metrics",
    icon: Hash,
    accent: "#10b981",
  },
  {
    label: "Categorical Cols",
    value: summary.categorical_columns,
    sub: "Text attributes",
    icon: Type,
    accent: "#6366f1",
  },
  {
    label: "Missing Values",
    value: summary.total_missing_values.toLocaleString(),
    sub: summary.total_missing_values === 0 ? "Complete integrity" : "Nulls detected",
    icon: AlertCircle,
    accent: summary.total_missing_values === 0 ? "#10b981" : "#f59e0b",
  },
  {
    label: "Dataset Size",
    value: summary.file_size_formatted || "—",
    sub: "Loaded in DuckDB",
    icon: HardDrive,
    accent: "#a855f7",
  },
];

export default function OverviewCards({ summary }: OverviewCardsProps) {
  const cards = CARDS(summary);

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div key={idx} className="kpi-card" style={{ "--kpi-accent": card.accent } as any}>
            {/* Top accent bar already handled by .kpi-card::before in globals.css */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-semibold uppercase tracking-wider"
                    style={{ color: "var(--text-muted)" }}>
                {card.label}
              </span>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                   style={{ background: `${card.accent}15`, border: `1px solid ${card.accent}30` }}>
                <Icon className="w-3.5 h-3.5" style={{ color: card.accent }} />
              </div>
            </div>

            <div className="text-2xl font-bold tracking-tight"
                 style={{ color: "var(--text-primary)" }}>
              {card.value}
            </div>

            <p className="text-[10px] mt-1 truncate" style={{ color: "var(--text-muted)" }}>
              {card.sub}
            </p>
          </div>
        );
      })}
    </div>
  );
}
