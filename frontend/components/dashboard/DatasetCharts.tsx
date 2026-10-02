"use client";

import React from "react";
import { ChartConfig } from "@/lib/types";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
  CartesianGrid,
} from "recharts";

interface DatasetChartsProps {
  charts: ChartConfig[];
}

const PASTEL_COLORS = [
  "#8b5cf6",
  "#a855f7",
  "#ec4899",
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#6366f1",
];

export default function DatasetCharts({ charts }: DatasetChartsProps) {
  if (!charts || charts.length === 0) {
    return (
      <div
        className="p-8 text-center text-xs font-medium rounded-2xl"
        style={{
          background: "var(--bg-secondary)",
          border: "1px solid var(--border)",
          color: "var(--text-muted)",
        }}
      >
        No dynamic visualizations available for this dataset schema.
      </div>
    );
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div
          className="p-2.5 rounded-xl text-xs shadow-xl"
          style={{
            background: "var(--bg-secondary)",
            border: "1px solid var(--border-hover)",
            color: "var(--text-primary)",
          }}
        >
          <p className="font-semibold" style={{ color: "var(--accent)" }}>
            {label || payload[0].name}
          </p>
          <p className="mt-0.5" style={{ color: "var(--text-secondary)" }}>
            <span style={{ color: "var(--text-muted)" }}>Value: </span>
            <span className="font-bold">{payload[0].value?.toLocaleString()}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {charts.map((chart) => (
        <div
          key={chart.id}
          className="p-5 rounded-2xl flex flex-col justify-between transition-all"
          style={{
            background: "var(--bg-secondary)",
            border: "1px solid var(--border)",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          {/* Header */}
          <div className="mb-4">
            <h3
              className="text-sm font-bold tracking-tight flex items-center justify-between"
              style={{ color: "var(--text-primary)" }}
            >
              <span>{chart.title}</span>
              <span
                className="text-[10px] uppercase font-mono px-2.5 py-0.5 rounded-full font-semibold"
                style={{
                  background: "var(--accent-light)",
                  color: "var(--accent)",
                  border: "1px solid var(--border-hover)",
                }}
              >
                {chart.type}
              </span>
            </h3>
            {chart.subtitle && (
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                {chart.subtitle}
              </p>
            )}
          </div>

          {/* Chart Rendering */}
          <div className="w-full h-64">
            {chart.type === "bar" && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chart.data} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(139, 92, 246, 0.1)" />
                  <XAxis
                    dataKey={chart.xAxisKey || "name"}
                    stroke="var(--text-muted)"
                    fontSize={11}
                    tickLine={false}
                    interval={0}
                    angle={-25}
                    textAnchor="end"
                  />
                  <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar
                    dataKey={chart.dataKey || "count"}
                    fill={chart.color || "#8b5cf6"}
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}

            {chart.type === "horizontal_bar" && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={chart.data}
                  margin={{ top: 10, right: 20, left: 40, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(139, 92, 246, 0.1)" />
                  <XAxis type="number" stroke="var(--text-muted)" fontSize={11} />
                  <YAxis
                    type="category"
                    dataKey={chart.yAxisKey || "name"}
                    stroke="var(--text-muted)"
                    fontSize={10}
                    tickLine={false}
                    width={90}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar
                    dataKey={chart.xAxisKey || "avg_value"}
                    fill={chart.color || "#a855f7"}
                    radius={[0, 6, 6, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}

            {chart.type === "donut" && (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip content={<CustomTooltip />} />
                  <Pie
                    data={chart.data}
                    dataKey={chart.dataKey || "value"}
                    nameKey={chart.nameKey || "name"}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                  >
                    {chart.data.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          chart.colors?.[index % chart.colors.length] ||
                          PASTEL_COLORS[index % PASTEL_COLORS.length]
                        }
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            )}

            {chart.type === "area" && (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chart.data} margin={{ top: 10, right: 10, left: -20, bottom: 10 }}>
                  <defs>
                    <linearGradient id="areaGradientPastel" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={chart.color || "#8b5cf6"} stopOpacity={0.7} />
                      <stop offset="95%" stopColor={chart.color || "#ec4899"} stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(139, 92, 246, 0.1)" />
                  <XAxis dataKey={chart.xAxisKey || "year"} stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                  <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey={chart.dataKey || "count"}
                    stroke={chart.color || "#8b5cf6"}
                    fillOpacity={1}
                    fill="url(#areaGradientPastel)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}

            {chart.type === "scatter" && (
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 10, right: 20, left: -10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(139, 92, 246, 0.1)" />
                  <XAxis
                    type="number"
                    dataKey={chart.xAxisKey || "x"}
                    name={chart.xAxisLabel || chart.xAxisKey || "X Axis"}
                    stroke="var(--text-muted)"
                    fontSize={11}
                  />
                  <YAxis
                    type="number"
                    dataKey={chart.yAxisKey || "y"}
                    name={chart.yAxisLabel || chart.yAxisKey || "Y Axis"}
                    stroke="var(--text-muted)"
                    fontSize={11}
                  />
                  <Tooltip cursor={{ strokeDasharray: "3 3" }} />
                  <Scatter name={chart.title || "Correlation"} data={chart.data} fill={chart.color || "#8b5cf6"} />
                </ScatterChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
