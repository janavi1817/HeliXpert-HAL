"use client";

import React, { useState, useEffect } from "react";
import { fetchDatasetStatistics, fetchDatasetCharts } from "@/lib/api";
import { DatasetSummary, ColumnStat, ChartConfig } from "@/lib/types";
import OverviewCards from "./OverviewCards";
import DatasetCharts from "./DatasetCharts";
import ColumnIntelligence from "./ColumnIntelligence";
import DataTable from "./DataTable";
import { BarChart3, Columns, Table as TableIcon, Loader2 } from "lucide-react";
import clsx from "clsx";
import { motion, AnimatePresence } from "framer-motion";

interface DatasetDashboardProps {
  datasetId: string;
  datasetName: string;
}

const TABS = [
  { id: "charts",  icon: BarChart3,  label: "Visualizations"     },
  { id: "columns", icon: Columns,    label: "Column Intelligence" },
  { id: "table",   icon: TableIcon,  label: "Data Table"          },
] as const;

export default function DatasetDashboard({ datasetId, datasetName }: DatasetDashboardProps) {
  const [activeSubTab, setActiveSubTab] = useState<"charts" | "columns" | "table">("charts");
  const [summary, setSummary] = useState<DatasetSummary | null>(null);
  const [columns, setColumns] = useState<ColumnStat[]>([]);
  const [charts,  setCharts]  = useState<ChartConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = async () => {
    setIsLoading(true);
    try {
      const [statsRes, chartsRes] = await Promise.all([
        fetchDatasetStatistics(datasetId),
        fetchDatasetCharts(datasetId),
      ]);
      setSummary(statsRes.summary);
      setColumns(statsRes.columns);
      setCharts(chartsRes.charts);
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { if (datasetId) load(); }, [datasetId]);

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
             style={{ background: "var(--accent-light)", border: "1px solid var(--border-hover)" }}>
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--accent-soft)" }} />
        </div>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Computing fleet intelligence...
        </p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-6"
    >
      {/* Header row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4"
           style={{ borderBottom: "1px solid var(--border)" }}>
        <div>
          <h2 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
            Dataset Intelligence Dashboard
          </h2>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
            Real-time analytics for{" "}
            <span className="font-semibold" style={{ color: "var(--accent-soft)" }}>
              {datasetName}
            </span>
          </p>
        </div>

        {/* Sub-tab pill switcher */}
        <div className="mode-pill">
          {TABS.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setActiveSubTab(id)}
              className={clsx("mode-pill-btn flex items-center gap-1.5", activeSubTab === id && "active")}
            >
              <Icon className="w-3 h-3" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      {summary && <OverviewCards summary={summary} />}

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeSubTab}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3 }}
        >
          {activeSubTab === "charts"  && <DatasetCharts charts={charts} />}
          {activeSubTab === "columns" && <ColumnIntelligence columns={columns} />}
          {activeSubTab === "table"   && <DataTable datasetId={datasetId} />}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}
