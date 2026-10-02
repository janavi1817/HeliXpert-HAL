"use client";

import React, { useState, useEffect } from "react";
import { fetchDatasetPreview } from "@/lib/api";
import { Search, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, Loader2 } from "lucide-react";

interface DataTableProps {
  datasetId: string;
}

export default function DataTable({ datasetId }: DataTableProps) {
  const [columns, setColumns] = useState<string[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<string | undefined>(undefined);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await fetchDatasetPreview(datasetId, page, 25, search, sortBy, sortDir);
      setColumns(data.columns);
      setRows(data.rows);
      setTotalRecords(data.total_records);
      setTotalPages(data.total_pages);
    } catch (err) {
      console.error("Failed to load table data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [datasetId, page, sortBy, sortDir]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadData();
  };

  const handleSort = (colName: string) => {
    if (sortBy === colName) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortBy(colName);
      setSortDir("asc");
    }
    setPage(1);
  };

  return (
    <div
      className="rounded-2xl overflow-hidden space-y-4"
      style={{
        background: "var(--bg-secondary)",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      {/* Table Toolbar */}
      <div
        className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <div>
          <h3 className="text-sm font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
            Fleet Data Explorer
          </h3>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
            Paginated analytical record browser directly querying DuckDB storage.
          </p>
        </div>

        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-72">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search records..."
            className="w-full pl-9 pr-4 py-2 rounded-xl text-xs transition-all focus:outline-none"
            style={{
              background: "var(--bg-tertiary)",
              border: "1px solid var(--border)",
              color: "var(--text-primary)",
            }}
          />
          <Search className="w-4 h-4 absolute left-3 top-2.5" style={{ color: "var(--text-muted)" }} />
        </form>
      </div>

      {/* Main Table */}
      <div className="relative overflow-x-auto min-h-[300px]">
        {isLoading && (
          <div
            className="absolute inset-0 flex items-center justify-center z-10"
            style={{ background: "rgba(255, 255, 255, 0.4)", backdropFilter: "blur(2px)" }}
          >
            <Loader2 className="w-7 h-7 animate-spin" style={{ color: "var(--accent)" }} />
          </div>
        )}

        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr
              className="font-mono uppercase text-[11px]"
              style={{
                background: "var(--bg-tertiary)",
                color: "var(--text-muted)",
                borderBottom: "1px solid var(--border)",
              }}
            >
              {columns.map((col) => (
                <th
                  key={col}
                  onClick={() => handleSort(col)}
                  className="py-3 px-4 cursor-pointer hover:text-[var(--accent)] transition-colors select-none font-semibold"
                >
                  <div className="flex items-center space-x-1.5">
                    <span>{col}</span>
                    {sortBy === col ? (
                      sortDir === "asc" ? (
                        <ArrowUp className="w-3.5 h-3.5" style={{ color: "var(--accent)" }} />
                      ) : (
                        <ArrowDown className="w-3.5 h-3.5" style={{ color: "var(--accent)" }} />
                      )
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-40" />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y font-mono text-[11px]" style={{ borderColor: "var(--border)" }}>
            {rows.length > 0 ? (
              rows.map((row, idx) => (
                <tr
                  key={idx}
                  className="transition-colors"
                  style={{ color: "var(--text-secondary)" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--bg-tertiary)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  {columns.map((col) => (
                    <td key={col} className="py-2.5 px-4 whitespace-nowrap">
                      {row[col] !== null && row[col] !== undefined ? String(row[col]) : "—"}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={columns.length || 1}
                  className="py-12 text-center"
                  style={{ color: "var(--text-muted)" }}
                >
                  No matching records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div
        className="p-4 flex items-center justify-between text-xs"
        style={{
          borderTop: "1px solid var(--border)",
          color: "var(--text-muted)",
        }}
      >
        <div>
          Showing page{" "}
          <span className="font-bold" style={{ color: "var(--text-primary)" }}>
            {page}
          </span>{" "}
          of{" "}
          <span className="font-bold" style={{ color: "var(--text-primary)" }}>
            {totalPages}
          </span>{" "}
          ({totalRecords.toLocaleString()} records)
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-1.5 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            style={{
              background: "var(--bg-tertiary)",
              border: "1px solid var(--border)",
              color: "var(--text-primary)",
            }}
            title="Previous Page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span
            className="font-mono px-3 py-1 rounded-full text-xs font-semibold"
            style={{
              background: "var(--accent-light)",
              color: "var(--accent)",
              border: "1px solid var(--border-hover)",
            }}
          >
            {page} / {totalPages}
          </span>

          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="p-1.5 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            style={{
              background: "var(--bg-tertiary)",
              border: "1px solid var(--border)",
              color: "var(--text-primary)",
            }}
            title="Next Page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
