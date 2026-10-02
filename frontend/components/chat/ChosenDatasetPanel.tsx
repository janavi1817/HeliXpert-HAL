"use client";

import React, { useState } from "react";
import { ChosenDataset } from "@/lib/types";
import {
  Database,
  Layers,
  Sparkles,
  CheckCircle2,
  Copy,
  Check,
  FileSpreadsheet,
  FileText,
  FileCode,
  HardDrive,
  Info,
} from "lucide-react";
import { motion } from "framer-motion";

interface ChosenDatasetPanelProps {
  datasets?: ChosenDataset[] | null;
  isOpen: boolean;
}

export default function ChosenDatasetPanel({
  datasets,
  isOpen,
}: ChosenDatasetPanelProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!isOpen) return null;

  if (!datasets || datasets.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: "auto" }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.25 }}
        className="mt-3 p-3.5 rounded-xl text-xs flex items-center gap-2"
        style={{
          background: "var(--bg-tertiary)",
          border: "1px solid var(--border)",
          color: "var(--text-muted)",
        }}
      >
        <Info className="w-4 h-4 text-amber-500 shrink-0" />
        <span>No specific dataset was utilized for this execution.</span>
      </motion.div>
    );
  }

  const handleCopy = (text: string, idKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(idKey);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getFileIcon = (type?: string) => {
    const t = (type || "").toUpperCase();
    if (t.includes("CSV") || t.includes("XLS")) {
      return <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0" />;
    }
    if (t.includes("PDF") || t.includes("DOC") || t.includes("TXT")) {
      return <FileText className="w-4 h-4 text-blue-400 shrink-0" />;
    }
    if (t.includes("JSON") || t.includes("PARQUET")) {
      return <FileCode className="w-4 h-4 text-purple-400 shrink-0" />;
    }
    return <HardDrive className="w-4 h-4 text-[var(--accent-soft)] shrink-0" />;
  };

  const getUsedForBadge = (usedFor: string) => {
    const norm = (usedFor || "").toLowerCase();
    if (norm.includes("duckdb") && norm.includes("rag")) {
      return (
        <span
          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide"
          style={{
            background: "rgba(16, 185, 129, 0.15)",
            border: "1px solid rgba(16, 185, 129, 0.35)",
            color: "#10b981",
          }}
        >
          <Sparkles className="w-3 h-3 text-emerald-400" />
          DuckDB &amp; RAG
        </span>
      );
    }
    if (norm.includes("rag")) {
      return (
        <span
          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide"
          style={{
            background: "rgba(59, 130, 246, 0.15)",
            border: "1px solid rgba(59, 130, 246, 0.35)",
            color: "#60a5fa",
          }}
        >
          <Layers className="w-3 h-3 text-blue-400" />
          RAG
        </span>
      );
    }
    return (
      <span
        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide"
        style={{
          background: "rgba(139, 92, 246, 0.15)",
          border: "1px solid rgba(139, 92, 246, 0.35)",
          color: "#a78bfa",
        }}
      >
        <Database className="w-3 h-3 text-purple-400" />
        DuckDB
      </span>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0, y: -6 }}
      animate={{ opacity: 1, height: "auto", y: 0 }}
      exit={{ opacity: 0, height: 0, y: -6 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="mt-3.5 rounded-2xl overflow-hidden shadow-lg border text-xs"
      style={{
        background: "var(--bg-secondary)",
        borderColor: "var(--border)",
      }}
    >
      {/* Panel Header */}
      <div
        className="px-4 py-3 flex items-center justify-between"
        style={{
          background: "var(--bg-tertiary)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded-lg flex items-center justify-center"
            style={{
              background: "rgba(16, 185, 129, 0.15)",
              border: "1px solid rgba(16, 185, 129, 0.3)",
            }}
          >
            <Database className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <span
            className="font-bold text-xs uppercase tracking-wider"
            style={{ color: "var(--text-primary)" }}
          >
            Chosen Dataset
          </span>
          <span
            className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold"
            style={{
              background: "rgba(16, 185, 129, 0.15)",
              color: "#10b981",
              border: "1px solid rgba(16, 185, 129, 0.3)",
            }}
          >
            {datasets.length} {datasets.length === 1 ? "Source Used" : "Sources Correlated"}
          </span>
        </div>

        <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
          Actual Execution Provenance
        </span>
      </div>

      {/* Dataset List */}
      <div className="p-3.5 space-y-3">
        {datasets.map((ds, idx) => {
          const displayFileName = ds.file_name || ds.original_filename || ds.name;
          const displayType = (ds.file_type || (displayFileName.includes(".") ? displayFileName.split(".").pop() : "CSV") || "CSV").toUpperCase();
          const dsId = ds.id || `ds_${idx}`;

          return (
            <div
              key={dsId + idx}
              className="p-3 rounded-xl border transition-all space-y-2.5"
              style={{
                background: "var(--surface)",
                borderColor: "var(--border-hover)",
              }}
            >
              {/* Top Row: Checkmark, File Name / Dataset Name, & Badges */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-start gap-2.5 min-w-0">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="font-bold text-xs"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {ds.name}
                      </span>
                      {displayFileName !== ds.name && (
                        <span
                          className="font-mono text-[11px]"
                          style={{ color: "var(--text-muted)" }}
                        >
                          ({displayFileName})
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 pl-6 sm:pl-0">
                  {/* File Type Pill */}
                  <span
                    className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase"
                    style={{
                      background: "var(--bg-tertiary)",
                      color: "var(--text-secondary)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    {displayType}
                  </span>

                  {/* Used For Badge */}
                  {getUsedForBadge(ds.used_for)}
                </div>
              </div>

              {/* Detail Grid: ID, File, Type, Usage */}
              <div
                className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 text-[11px]"
                style={{ borderTop: "1px solid var(--border)" }}
              >
                {/* File Name */}
                <div className="flex items-center gap-1.5 pl-6 sm:pl-0 text-muted">
                  {getFileIcon(displayType)}
                  <span className="text-[10px] uppercase font-semibold" style={{ color: "var(--text-muted)" }}>
                    File:
                  </span>
                  <span className="font-mono truncate" style={{ color: "var(--text-primary)" }}>
                    {displayFileName}
                  </span>
                </div>

                {/* Used For Indicator */}
                <div className="flex items-center gap-1.5 pl-6 sm:pl-0">
                  <span className="text-[10px] uppercase font-semibold" style={{ color: "var(--text-muted)" }}>
                    Used for:
                  </span>
                  <span className="font-semibold" style={{ color: "var(--text-primary)" }}>
                    {ds.used_for}
                  </span>
                </div>

                {/* Dataset ID with Copy */}
                {ds.id && (
                  <div className="flex items-center gap-1.5 pl-6 sm:pl-0 sm:col-span-2">
                    <span className="text-[10px] uppercase font-semibold" style={{ color: "var(--text-muted)" }}>
                      Dataset ID:
                    </span>
                    <span className="font-mono text-[10px] px-1.5 py-0.2 rounded"
                          style={{ background: "var(--bg-tertiary)", color: "var(--text-muted)" }}>
                      {ds.id}
                    </span>
                    <button
                      onClick={() => handleCopy(ds.id!, ds.id!)}
                      className="p-1 rounded hover:bg-[var(--border)] transition-colors text-[var(--text-muted)]"
                      title="Copy Dataset ID"
                    >
                      {copiedId === ds.id ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
