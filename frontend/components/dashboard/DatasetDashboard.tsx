"use client";

import React, { useState, useEffect } from "react";
import { fetchDatasets, fetchDatasetStatistics, fetchDatasetCharts, fetchAllDatasetsOverview } from "@/lib/api";
import { Dataset, DatasetSummary, ColumnStat, ChartConfig, AllDatasetsOverview } from "@/lib/types";
import OverviewCards from "./OverviewCards";
import DatasetCharts from "./DatasetCharts";
import ColumnIntelligence from "./ColumnIntelligence";
import DataTable from "./DataTable";
import {
  BarChart3,
  Columns,
  Table as TableIcon,
  Loader2,
  Database,
  Layers,
  ChevronDown,
  ArrowRight,
  HardDrive,
  FileSpreadsheet,
  Check
} from "lucide-react";
import clsx from "clsx";
import { motion, AnimatePresence } from "framer-motion";

interface DatasetDashboardProps {
  datasetId?: string;
  datasetName?: string;
  datasets?: Dataset[];
  onSelectDataset?: (dataset: Dataset) => void;
}

const TABS = [
  { id: "charts",  icon: BarChart3,  label: "Visualizations"     },
  { id: "columns", icon: Columns,    label: "Column Intelligence" },
  { id: "table",   icon: TableIcon,  label: "Data Table"          },
] as const;

export default function DatasetDashboard({
  datasetId,
  datasetName,
  datasets = [],
  onSelectDataset
}: DatasetDashboardProps) {
  const [datasetList, setDatasetList] = useState<Dataset[]>(datasets);
  const [selectedId, setSelectedId] = useState<string>(datasetId || (datasets[0]?.id ?? "all"));
  const [activeSubTab, setActiveSubTab] = useState<"charts" | "columns" | "table">("charts");
  
  // Single dataset state
  const [summary, setSummary] = useState<DatasetSummary | null>(null);
  const [columns, setColumns] = useState<ColumnStat[]>([]);
  const [charts, setCharts] = useState<ChartConfig[]>([]);
  const [isLoadingSingle, setIsLoadingSingle] = useState(false);

  // All datasets combined state
  const [allOverview, setAllOverview] = useState<AllDatasetsOverview | null>(null);
  const [allDatasetsCharts, setAllDatasetsCharts] = useState<Record<string, ChartConfig[]>>({});
  const [allDatasetsSummaries, setAllDatasetsSummaries] = useState<Record<string, DatasetSummary>>({});
  const [isLoadingAll, setIsLoadingAll] = useState(false);

  // Sync datasetList if prop changes or fetch if empty
  useEffect(() => {
    if (datasets && datasets.length > 0) {
      setDatasetList(datasets);
    } else {
      fetchDatasets()
        .then((data) => {
          setDatasetList(data);
          if (!selectedId && data.length > 0) {
            setSelectedId(data[0].id);
          }
        })
        .catch((err) => console.error("Failed to load dataset list:", err));
    }
  }, [datasets]);

  // Sync selectedId with incoming datasetId prop
  useEffect(() => {
    if (datasetId && datasetId !== selectedId && selectedId !== "all") {
      setSelectedId(datasetId);
    }
  }, [datasetId]);

  // Load single dataset data
  const loadSingleDataset = async (id: string) => {
    setIsLoadingSingle(true);
    try {
      const [statsRes, chartsRes] = await Promise.all([
        fetchDatasetStatistics(id),
        fetchDatasetCharts(id),
      ]);
      setSummary(statsRes.summary);
      setColumns(statsRes.columns);
      setCharts(chartsRes.charts);
    } catch (err) {
      console.error(`Failed to load data for dataset ${id}:`, err);
    } finally {
      setIsLoadingSingle(false);
    }
  };

  // Load all datasets overview
  const loadAllDatasets = async () => {
    setIsLoadingAll(true);
    try {
      const overview = await fetchAllDatasetsOverview();
      setAllOverview(overview);

      // Pre-load top charts and statistics for each isolated dataset
      const chartsMap: Record<string, ChartConfig[]> = {};
      const summariesMap: Record<string, DatasetSummary> = {};

      await Promise.all(
        overview.datasets.map(async (d) => {
          try {
            const [cRes, sRes] = await Promise.all([
              fetchDatasetCharts(d.id),
              fetchDatasetStatistics(d.id),
            ]);
            chartsMap[d.id] = cRes.charts;
            summariesMap[d.id] = sRes.summary;
          } catch (e) {
            console.error(`Failed to load preview for dataset ${d.id}:`, e);
          }
        })
      );

      setAllDatasetsCharts(chartsMap);
      setAllDatasetsSummaries(summariesMap);
    } catch (err) {
      console.error("Failed to load all datasets overview:", err);
    } finally {
      setIsLoadingAll(false);
    }
  };

  // Trigger loading depending on selection
  useEffect(() => {
    if (selectedId === "all") {
      loadAllDatasets();
    } else if (selectedId) {
      loadSingleDataset(selectedId);
      const matched = datasetList.find((d) => d.id === selectedId);
      if (matched && onSelectDataset) {
        onSelectDataset(matched);
      }
    }
  }, [selectedId]);

  const currentDatasetObj = datasetList.find((d) => d.id === selectedId);
  const activeTitle = selectedId === "all" ? "Combined Fleet Overview" : (currentDatasetObj?.name || datasetName || "Dataset");

  const handleSelectionChange = (newId: string) => {
    setSelectedId(newId);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-6"
    >
      {/* ── Top Bar: Dataset Selector & View Mode Switcher ── */}
      <div
        className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 md:gap-5">
          <div>
            <h2 className="text-xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
              Dataset Intelligence Dashboard
            </h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
              Analyzing{" "}
              <span className="font-semibold" style={{ color: "var(--accent-soft)" }}>
                {activeTitle}
              </span>
            </p>
          </div>

          {/* ── SELECT DATASET DROPDOWN (Requirement 2) ── */}
          <div className="flex items-center gap-2 pt-1 sm:pt-0">
            <span className="text-xs font-semibold uppercase tracking-wider shrink-0"
                  style={{ color: "var(--text-muted)" }}>
              Select Dataset:
            </span>

            <div className="relative">
              <select
                id="dataset-selector-dropdown"
                value={selectedId}
                onChange={(e) => handleSelectionChange(e.target.value)}
                className="appearance-none text-xs font-semibold py-2 pl-3.5 pr-9 rounded-xl cursor-pointer transition-all outline-none"
                style={{
                  background: "var(--bg-tertiary)",
                  color: "var(--text-primary)",
                  border: "1px solid var(--border-hover)",
                  boxShadow: "var(--shadow-sm)",
                }}
              >
                <option value="all">
                  🌟 All Datasets ({datasetList.length} Total Combined)
                </option>
                {datasetList.map((d) => (
                  <option key={d.id} value={d.id}>
                    📊 {d.name} ({d.row_count} rows · {d.column_count} cols)
                  </option>
                ))}
              </select>
              <ChevronDown
                className="w-4 h-4 pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2"
                style={{ color: "var(--text-muted)" }}
              />
            </div>
          </div>
        </div>

        {/* Sub-tab switcher (only when a specific dataset is selected) */}
        {selectedId !== "all" && (
          <div className="mode-pill self-start md:self-auto">
            {TABS.map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                onClick={() => setActiveSubTab(id)}
                className={clsx("mode-pill-btn flex items-center gap-1.5", activeSubTab === id && "active")}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── VIEW 1: ALL DATASETS COMBINED OVERVIEW ── */}
      {selectedId === "all" ? (
        isLoadingAll ? (
          <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--accent)" }} />
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Aggregating fleet intelligence across all active datasets...
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Combined KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
              <div className="kpi-card" style={{ "--kpi-accent": "#8b5cf6" } as any}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-semibold uppercase tracking-wider"
                        style={{ color: "var(--text-muted)" }}>
                    Active Datasets
                  </span>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                       style={{ background: "#8b5cf615", border: "1px solid #8b5cf630" }}>
                    <Database className="w-3.5 h-3.5 text-purple-400" />
                  </div>
                </div>
                <div className="text-2xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
                  {allOverview?.total_datasets || datasetList.length}
                </div>
                <p className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>
                  Distinct DuckDB analytical tables
                </p>
              </div>

              <div className="kpi-card" style={{ "--kpi-accent": "#3b82f6" } as any}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-semibold uppercase tracking-wider"
                        style={{ color: "var(--text-muted)" }}>
                    Total Fleet Records
                  </span>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                       style={{ background: "#3b82f615", border: "1px solid #3b82f630" }}>
                    <Layers className="w-3.5 h-3.5 text-blue-400" />
                  </div>
                </div>
                <div className="text-2xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
                  {allOverview?.total_rows?.toLocaleString() || 0}
                </div>
                <p className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>
                  Structured rows across all tables
                </p>
              </div>

              <div className="kpi-card" style={{ "--kpi-accent": "#10b981" } as any}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-semibold uppercase tracking-wider"
                        style={{ color: "var(--text-muted)" }}>
                    Schema Attributes
                  </span>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                       style={{ background: "#10b98115", border: "1px solid #10b98130" }}>
                    <BarChart3 className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                </div>
                <div className="text-2xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
                  {allOverview?.total_columns || 0}
                </div>
                <p className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>
                  Total indexed columns
                </p>
              </div>

              <div className="kpi-card" style={{ "--kpi-accent": "#a855f7" } as any}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-semibold uppercase tracking-wider"
                        style={{ color: "var(--text-muted)" }}>
                    Ingested Size
                  </span>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                       style={{ background: "#a855f715", border: "1px solid #a855f730" }}>
                    <HardDrive className="w-3.5 h-3.5 text-fuchsia-400" />
                  </div>
                </div>
                <div className="text-2xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
                  {allOverview?.file_size_formatted || "—"}
                </div>
                <p className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>
                  In-memory DuckDB columnar store
                </p>
              </div>
            </div>

            {/* Dataset Portfolio Directory */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
                  Active Dataset Catalog ({datasetList.length} Datasets Available)
                </h3>
                <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                  Click any dataset to inspect isolated analytics
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {datasetList.map((d) => (
                  <div
                    key={d.id}
                    onClick={() => handleSelectionChange(d.id)}
                    className="p-5 rounded-2xl cursor-pointer transition-all hover:scale-[1.01] flex flex-col justify-between"
                    style={{
                      background: "var(--bg-secondary)",
                      border: "1px solid var(--border)",
                      boxShadow: "var(--shadow-sm)",
                    }}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full font-semibold"
                              style={{ background: "var(--accent-light)", color: "var(--accent)" }}>
                          {d.file_type}
                        </span>
                        <span className="text-[10px] font-mono" style={{ color: "var(--text-muted)" }}>
                          {d.duckdb_table_name}
                        </span>
                      </div>

                      <h4 className="font-bold text-sm tracking-tight mb-1" style={{ color: "var(--text-primary)" }}>
                        {d.name}
                      </h4>
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                        {d.original_filename}
                      </p>
                    </div>

                    <div className="pt-4 mt-3 flex items-center justify-between text-xs"
                         style={{ borderTop: "1px solid var(--border)" }}>
                      <div className="flex items-center gap-3">
                        <span className="font-bold" style={{ color: "var(--text-primary)" }}>
                          {d.row_count} <span className="font-normal text-[11px]" style={{ color: "var(--text-muted)" }}>rows</span>
                        </span>
                        <span className="font-bold" style={{ color: "var(--text-primary)" }}>
                          {d.column_count} <span className="font-normal text-[11px]" style={{ color: "var(--text-muted)" }}>cols</span>
                        </span>
                      </div>

                      <div className="flex items-center gap-1 font-semibold text-xs transition-colors"
                           style={{ color: "var(--accent)" }}>
                        <span>Inspect</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Separated Dataset Sections (Never mix unrelated metrics) */}
            <div className="space-y-10 pt-4">
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
                <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full"
                      style={{ background: "var(--bg-tertiary)", color: "var(--accent-soft)", border: "1px solid var(--border-hover)" }}>
                  Isolated Dataset Visualizations
                </span>
                <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
              </div>

              {datasetList.map((d, index) => {
                const dCharts = allDatasetsCharts[d.id] || [];
                const dSummary = allDatasetsSummaries[d.id];
                return (
                  <section
                    key={d.id}
                    className="p-6 rounded-3xl space-y-5"
                    style={{
                      background: "var(--bg-secondary)",
                      border: "1px solid var(--border)",
                      boxShadow: "var(--shadow-sm)",
                    }}
                  >
                    {/* Dataset Section Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3"
                         style={{ borderBottom: "1px solid var(--border)" }}>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                             style={{ background: "var(--accent-light)", border: "1px solid var(--border-hover)" }}>
                          <FileSpreadsheet className="w-4 h-4" style={{ color: "var(--accent)" }} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-mono uppercase px-2 py-0.2 rounded-md font-semibold"
                                  style={{ background: "var(--bg-tertiary)", color: "var(--text-muted)" }}>
                              Dataset #{index + 1}
                            </span>
                            <h3 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>
                              {d.name}
                            </h3>
                          </div>
                          <p className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                            DuckDB Table: <span className="font-mono text-purple-400 font-semibold">{d.duckdb_table_name}</span> · {d.row_count} rows · {d.column_count} attributes
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => handleSelectionChange(d.id)}
                        className="btn-secondary text-xs py-1.5 px-4 rounded-xl flex items-center gap-1.5 self-start sm:self-auto"
                      >
                        <span>Full Dataset View</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Isolated KPIs */}
                    {dSummary && <OverviewCards summary={dSummary} />}

                    {/* Isolated Charts */}
                    {dCharts.length > 0 ? (
                      <DatasetCharts charts={dCharts.slice(0, 2)} />
                    ) : (
                      <p className="text-xs p-4 rounded-xl text-center"
                         style={{ background: "var(--bg-tertiary)", color: "var(--text-muted)" }}>
                        Generating visualizations for this dataset schema...
                      </p>
                    )}
                  </section>
                );
              })}
            </div>
          </div>
        )
      ) : (
        /* ── VIEW 2: SINGLE SELECTED DATASET VIEW (Requirement 2) ── */
        isLoadingSingle ? (
          <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--accent)" }} />
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Analyzing dataset schema and computing statistics...
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* KPI Cards for the selected dataset */}
            {summary && <OverviewCards summary={summary} />}

            {/* Tab content strictly for the selected dataset */}
            <AnimatePresence mode="wait">
              <motion.div
                key={`${selectedId}-${activeSubTab}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.25 }}
              >
                {activeSubTab === "charts" && <DatasetCharts charts={charts} />}
                {activeSubTab === "columns" && <ColumnIntelligence columns={columns} />}
                {activeSubTab === "table" && <DataTable datasetId={selectedId} />}
              </motion.div>
            </AnimatePresence>
          </div>
        )
      )}
    </motion.div>
  );
}
