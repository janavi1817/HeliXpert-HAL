"use client";

import React, { useState } from "react";
import { ColumnStat } from "@/lib/types";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { X, Hash, Type, ChevronRight, BarChart2, PieChart } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ColumnIntelligenceProps {
  columns: ColumnStat[];
}

export default function ColumnIntelligence({ columns }: ColumnIntelligenceProps) {
  const [selectedColumn, setSelectedColumn] = useState<ColumnStat | null>(null);

  return (
    <div className="space-y-4">
      {/* Column Intelligence Table */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: "var(--bg-secondary)",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <div
          className="p-4 flex items-center justify-between"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <div>
            <h3 className="text-sm font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
              Column Intelligence
            </h3>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
              Detailed statistical distribution and type analysis per dataset column. Click any row for histogram & frequency breakdown.
            </p>
          </div>
          <span
            className="text-xs font-mono px-3 py-1 rounded-full font-semibold"
            style={{
              background: "var(--accent-light)",
              color: "var(--accent)",
              border: "1px solid var(--border-hover)",
            }}
          >
            {columns.length} Detected Attributes
          </span>
        </div>

        <div className="overflow-x-auto">
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
                <th className="py-3 px-4 font-semibold">Column Name</th>
                <th className="py-3 px-4 font-semibold">Type</th>
                <th className="py-3 px-4 font-semibold">Unique Values</th>
                <th className="py-3 px-4 font-semibold">Missing</th>
                <th className="py-3 px-4 font-semibold">Min</th>
                <th className="py-3 px-4 font-semibold">Max</th>
                <th className="py-3 px-4 font-semibold">Average</th>
                <th className="py-3 px-4 text-right font-semibold">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: "var(--border)" }}>
              {columns.map((col) => (
                <tr
                  key={col.column_name}
                  onClick={() => setSelectedColumn(col)}
                  className="cursor-pointer transition-colors group"
                  style={{
                    color: "var(--text-secondary)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--bg-tertiary)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  <td
                    className="py-3 px-4 font-mono font-semibold"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {col.column_name}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium"
                      style={{
                        background:
                          col.type === "numeric"
                            ? "rgba(16, 185, 129, 0.1)"
                            : "var(--accent-light)",
                        color:
                          col.type === "numeric" ? "#10b981" : "var(--accent)",
                        border:
                          col.type === "numeric"
                            ? "1px solid rgba(16, 185, 129, 0.25)"
                            : "1px solid var(--border-hover)",
                      }}
                    >
                      {col.type === "numeric" ? (
                        <Hash className="w-3 h-3" />
                      ) : (
                        <Type className="w-3 h-3" />
                      )}
                      <span className="capitalize">{col.type}</span>
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono">
                    {col.unique_values.toLocaleString()} unique
                  </td>
                  <td className="py-3 px-4 font-mono">
                    {col.missing_values > 0 ? (
                      <span style={{ color: "#f59e0b" }}>
                        {col.missing_values} ({col.missing_percentage}%)
                      </span>
                    ) : (
                      <span style={{ color: "#10b981" }}>0 (0%)</span>
                    )}
                  </td>
                  <td className="py-3 px-4 font-mono" style={{ color: "var(--text-muted)" }}>
                    {col.min !== undefined && col.min !== null ? col.min.toLocaleString() : "—"}
                  </td>
                  <td className="py-3 px-4 font-mono" style={{ color: "var(--text-muted)" }}>
                    {col.max !== undefined && col.max !== null ? col.max.toLocaleString() : "—"}
                  </td>
                  <td
                    className="py-3 px-4 font-mono font-semibold"
                    style={{ color: "var(--accent)" }}
                  >
                    {col.average !== undefined && col.average !== null
                      ? col.average.toLocaleString()
                      : "—"}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      className="p-1 rounded transition-transform group-hover:translate-x-1"
                      style={{ color: "var(--accent)" }}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drill-down Detail Modal / Drawer */}
      <AnimatePresence>
        {selectedColumn && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)" }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 16 }}
              className="relative w-full max-w-xl rounded-3xl p-6 space-y-5 max-h-[90vh] overflow-y-auto"
              style={{
                background: "var(--bg-secondary)",
                border: "1px solid var(--border-hover)",
                boxShadow: "var(--shadow-xl)",
              }}
            >
              {/* Modal Header */}
              <div
                className="flex items-center justify-between pb-3"
                style={{ borderBottom: "1px solid var(--border)" }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-2xl flex items-center justify-center"
                    style={{
                      background: "var(--accent-light)",
                      border: "1px solid var(--border-hover)",
                    }}
                  >
                    {selectedColumn.type === "numeric" ? (
                      <BarChart2 className="w-5 h-5" style={{ color: "var(--accent)" }} />
                    ) : (
                      <PieChart className="w-5 h-5" style={{ color: "var(--accent)" }} />
                    )}
                  </div>
                  <div>
                    <h3
                      className="text-base font-bold font-mono"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {selectedColumn.column_name}
                    </h3>
                    <p className="text-xs capitalize" style={{ color: "var(--text-muted)" }}>
                      {selectedColumn.type} Attribute Analysis
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedColumn(null)}
                  className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                  style={{
                    color: "var(--text-muted)",
                    background: "var(--bg-tertiary)",
                  }}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div
                  className="p-3 rounded-2xl"
                  style={{
                    background: "var(--bg-tertiary)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <div className="text-[10px] uppercase font-mono" style={{ color: "var(--text-muted)" }}>
                    Unique
                  </div>
                  <div className="text-base font-bold font-mono mt-0.5" style={{ color: "var(--text-primary)" }}>
                    {selectedColumn.unique_values.toLocaleString()}
                  </div>
                </div>
                <div
                  className="p-3 rounded-2xl"
                  style={{
                    background: "var(--bg-tertiary)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <div className="text-[10px] uppercase font-mono" style={{ color: "var(--text-muted)" }}>
                    Missing
                  </div>
                  <div className="text-base font-bold font-mono mt-0.5" style={{ color: "var(--text-primary)" }}>
                    {selectedColumn.missing_values}
                  </div>
                </div>
                {selectedColumn.type === "numeric" && (
                  <>
                    <div
                      className="p-3 rounded-2xl"
                      style={{
                        background: "var(--bg-tertiary)",
                        border: "1px solid var(--border)",
                      }}
                    >
                      <div className="text-[10px] uppercase font-mono" style={{ color: "var(--text-muted)" }}>
                        Mean
                      </div>
                      <div className="text-base font-bold font-mono mt-0.5" style={{ color: "var(--accent)" }}>
                        {selectedColumn.average?.toLocaleString() ?? "—"}
                      </div>
                    </div>
                    <div
                      className="p-3 rounded-2xl"
                      style={{
                        background: "var(--bg-tertiary)",
                        border: "1px solid var(--border)",
                      }}
                    >
                      <div className="text-[10px] uppercase font-mono" style={{ color: "var(--text-muted)" }}>
                        Median
                      </div>
                      <div className="text-base font-bold font-mono mt-0.5" style={{ color: "var(--accent)" }}>
                        {selectedColumn.median?.toLocaleString() ?? "—"}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Numeric Histogram Breakdown */}
              {selectedColumn.type === "numeric" &&
                selectedColumn.histogram &&
                selectedColumn.histogram.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <h4
                      className="text-xs font-bold uppercase tracking-wider font-mono"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Distribution Histogram
                    </h4>
                    <div
                      className="h-52 p-3 rounded-2xl"
                      style={{
                        background: "var(--bg-tertiary)",
                        border: "1px solid var(--border)",
                      }}
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={selectedColumn.histogram}
                          margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
                        >
                          <XAxis
                            dataKey="range"
                            stroke="var(--text-muted)"
                            fontSize={10}
                            angle={-25}
                            textAnchor="end"
                          />
                          <YAxis stroke="var(--text-muted)" fontSize={10} />
                          <Tooltip />
                          <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div
                      className="flex justify-between text-[11px] font-mono px-1"
                      style={{ color: "var(--text-muted)" }}
                    >
                      <span>Min: {selectedColumn.min}</span>
                      <span>Std Dev: {selectedColumn.std_dev}</span>
                      <span>Max: {selectedColumn.max}</span>
                    </div>
                  </div>
                )}

              {/* Categorical Top Values Breakdown */}
              {selectedColumn.type === "categorical" && selectedColumn.top_values && (
                <div className="space-y-3 pt-2">
                  <h4
                    className="text-xs font-bold uppercase tracking-wider font-mono"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Top Frequencies
                  </h4>
                  <div className="space-y-2">
                    {selectedColumn.top_values.map((item, idx) => (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span style={{ color: "var(--text-secondary)" }}>{item.label}</span>
                          <span className="font-mono font-bold" style={{ color: "var(--accent)" }}>
                            {item.count.toLocaleString()}
                          </span>
                        </div>
                        <div
                          className="w-full h-1.5 rounded-full overflow-hidden"
                          style={{ background: "var(--bg-tertiary)" }}
                        >
                          <div
                            className="h-full rounded-full"
                            style={{
                              background: "var(--gradient-cta)",
                              width: `${
                                (item.count / (selectedColumn.top_values?.[0]?.count || 1)) * 100
                              }%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
