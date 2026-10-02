"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  fetchDatasets,
  fetchDatasetStatistics,
  fetchDatasetCharts,
  fetchAllDatasetsOverview,
  deleteDataset
} from "@/lib/api";
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
  Trash2,
  AlertTriangle
} from "lucide-react";
import clsx from "clsx";
import { motion, AnimatePresence } from "framer-motion";

interface DatasetDashboardProps {
  datasetId?: string;
  datasetName?: string;
  datasets?: Dataset[];
  onSelectDataset?: (dataset: Dataset) => void;
  onDeleteDataset?: (datasetId: string) => void;
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
  onSelectDataset,
  onDeleteDataset
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

  // Delete modal state
  const [datasetToDelete, setDatasetToDelete] = useState<Dataset | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Dropdown open state & ref
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Sync datasetList if prop changes or fetch if empty; auto-select newly added dataset
  useEffect(() => {
    if (datasets && datasets.length > 0) {
      setDatasetList(datasets);
      // If datasetId changed or newly extracted dataset arrived, switch to it immediately
      if (datasetId && datasets.some((d) => d.id === datasetId)) {
        setSelectedId(datasetId);
      } else if (!datasets.some((d) => d.id === selectedId) && selectedId !== "all") {
        setSelectedId(datasets[0]?.id ?? "all");
      }
    } else {
      fetchDatasets()
        .then((data) => {
          setDatasetList(data);
          if ((!selectedId || selectedId === "all") && data.length > 0) {
            setSelectedId(data[0].id);
          }
        })
        .catch((err) => console.error("Failed to load dataset list:", err));
    }
  }, [datasets, datasetId]);

  // Sync selectedId with incoming datasetId prop
  useEffect(() => {
    if (datasetId && datasetId !== selectedId) {
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
        overview.datasets.map(async (d: any) => {
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

  // Dataset deletion logic
  const confirmDelete = async () => {
    if (!datasetToDelete) return;
    setIsDeleting(true);
    try {
      await deleteDataset(datasetToDelete.id);
      const updated = datasetList.filter((d) => d.id !== datasetToDelete.id);
      setDatasetList(updated);

      if (onDeleteDataset) {
        onDeleteDataset(datasetToDelete.id);
      }

      if (selectedId === datasetToDelete.id) {
        setSelectedId(updated[0]?.id ?? "all");
      } else if (selectedId === "all") {
        loadAllDatasets();
      }
      setDatasetToDelete(null);
    } catch (err: any) {
      console.error("Failed to delete dataset:", err);
      alert(err.message || "Failed to delete dataset.");
    } finally {
      setIsDeleting(false);
    }
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

          {/* ── SELECT DATASET DROPDOWN WITH EMBEDDED DELETE OPTION (Requirement 2) ── */}
          <div className="flex items-center gap-2 pt-1 sm:pt-0">
            <span className="text-xs font-semibold uppercase tracking-wider shrink-0"
                  style={{ color: "var(--text-muted)" }}>
              Select Dataset:
            </span>

            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                id="dataset-selector-dropdown"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-2 text-xs font-semibold py-2 px-3.5 rounded-xl transition-all border outline-none cursor-pointer"
                style={{
                  background: "var(--bg-tertiary)",
                  color: "var(--text-primary)",
                  borderColor: isDropdownOpen ? "var(--accent-soft)" : "var(--border-hover)",
                  boxShadow: "var(--shadow-sm)",
                }}
              >
                <span className="truncate max-w-[200px] sm:max-w-[260px]">
                  {selectedId === "all"
                    ? `🌟 All Datasets (${datasetList.length} Total Combined)`
                    : `📊 ${currentDatasetObj?.name || "Select Dataset"}`}
                </span>
                <ChevronDown
                  className={clsx(
                    "w-4 h-4 transition-transform text-[var(--text-muted)] shrink-0",
                    isDropdownOpen && "rotate-180"
                  )}
                />
              </button>

              <AnimatePresence>
                {isDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -4, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.97 }}
                    transition={{ duration: 0.15 }}
                    className="absolute left-0 mt-2 w-72 rounded-2xl z-50 overflow-hidden shadow-2xl border"
                    style={{
                      background: "var(--bg-secondary)",
                      borderColor: "var(--border-hover)",
                      boxShadow: "var(--shadow-xl)",
                      backdropFilter: "blur(20px)",
                    }}
                  >
                    {/* Header */}
                    <div className="px-3.5 py-2.5">
                      <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                        Select Dataset
                      </span>
                    </div>

                    {/* Divider */}
                    <div className="h-px w-full" style={{ background: "var(--border)" }} />

                    {/* Datasets list */}
                    <div className="py-1 max-h-56 overflow-y-auto">
                      {/* All Datasets option */}
                      <button
                        type="button"
                        onClick={() => {
                          handleSelectionChange("all");
                          setIsDropdownOpen(false);
                        }}
                        className="w-full text-left px-3.5 py-2 text-xs flex items-center justify-between transition-colors hover:bg-[var(--accent-light)]"
                        style={{
                          color: selectedId === "all" ? "var(--accent-soft)" : "var(--text-primary)",
                          fontWeight: selectedId === "all" ? 600 : 400,
                        }}
                      >
                        <span>🌟 All Datasets</span>
                        {selectedId === "all" && <span className="text-[11px] text-emerald-400 font-bold">✓</span>}
                      </button>

                      {/* Individual Datasets */}
                      {datasetList.map((d) => (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => {
                            handleSelectionChange(d.id);
                            setIsDropdownOpen(false);
                          }}
                          className="w-full text-left px-3.5 py-2 text-xs flex items-center justify-between transition-colors hover:bg-[var(--accent-light)]"
                          style={{
                            color: selectedId === d.id ? "var(--accent-soft)" : "var(--text-primary)",
                            fontWeight: selectedId === d.id ? 600 : 400,
                          }}
                        >
                          <div className="truncate min-w-0 pr-2">
                            <span className="font-medium block truncate">📊 {d.name}</span>
                            <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                              {d.row_count} rows · {d.column_count} cols
                            </span>
                          </div>
                          {selectedId === d.id && <span className="text-[11px] text-emerald-400 font-bold shrink-0">✓</span>}
                        </button>
                      ))}
                    </div>

                    {/* Divider */}
                    <div className="h-px w-full" style={{ background: "var(--border)" }} />

                    {/* Delete Option Section */}
                    <div className="p-1.5">
                      {selectedId !== "all" && currentDatasetObj ? (
                        <button
                          type="button"
                          onClick={() => {
                            setIsDropdownOpen(false);
                            setDatasetToDelete(currentDatasetObj);
                          }}
                          className="w-full text-left px-3 py-2 text-xs rounded-xl flex items-center gap-2 transition-all font-semibold hover:bg-red-500/15"
                          style={{
                            color: "#ef4444",
                          }}
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-500 shrink-0" />
                          <span>Delete {currentDatasetObj.name}</span>
                        </button>
                      ) : (
                        <div className="px-3 py-1.5 text-[11px] flex items-center justify-between"
                             style={{ color: "var(--text-muted)" }}>
                          <span>Delete Dataset</span>
                          <span className="text-[10px] italic">(Select a dataset above)</span>
                        </div>
                      )}
                    </div>

                    {/* Bottom Divider */}
                    <div className="h-px w-full" style={{ background: "var(--border)" }} />
                  </motion.div>
                )}
              </AnimatePresence>
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
                  Select or delete any dataset directly
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

                      <div className="flex items-center gap-2 self-start sm:self-auto">
                        <button
                          onClick={() => handleSelectionChange(d.id)}
                          className="btn-secondary text-xs py-1.5 px-4 rounded-xl flex items-center gap-1.5"
                        >
                          <span>Full Dataset View</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
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

      {/* ── CONFIRMATION MODAL FOR DATASET DELETION ── */}
      <AnimatePresence>
        {datasetToDelete && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(8px)" }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 14 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 14 }}
              className="w-full max-w-md rounded-3xl p-6 space-y-4"
              style={{
                background: "var(--bg-secondary)",
                border: "1px solid var(--border-hover)",
                boxShadow: "var(--shadow-xl)",
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
                  style={{
                    background: "rgba(239, 68, 68, 0.12)",
                    border: "1px solid rgba(239, 68, 68, 0.25)",
                  }}
                >
                  <Trash2 className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <h3 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>
                    Delete Dataset
                  </h3>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    Permanent removal from DuckDB
                  </p>
                </div>
              </div>

              <div
                className="p-3.5 rounded-2xl text-xs space-y-1.5"
                style={{
                  background: "var(--bg-tertiary)",
                  border: "1px solid var(--border)",
                }}
              >
                <p style={{ color: "var(--text-primary)" }}>
                  Are you sure you want to delete{" "}
                  <span className="font-bold text-red-400">"{datasetToDelete.name}"</span>?
                </p>
                <p style={{ color: "var(--text-muted)" }} className="text-[11px]">
                  DuckDB table <code className="font-mono text-purple-400">{datasetToDelete.duckdb_table_name}</code> ({datasetToDelete.row_count} rows) will be permanently dropped and vector cache cleared.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setDatasetToDelete(null)}
                  className="btn-secondary text-xs py-2 px-4 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={confirmDelete}
                  className="text-xs py-2 px-4 rounded-xl font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                  style={{
                    background: "#ef4444",
                    color: "#ffffff",
                    boxShadow: "0 2px 8px rgba(239, 68, 68, 0.3)",
                  }}
                >
                  {isDeleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isDeleting ? "Deleting..." : "Delete Dataset"}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
