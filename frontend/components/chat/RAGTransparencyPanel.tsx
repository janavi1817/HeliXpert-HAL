"use client";

import React, { useState } from "react";
import { RAGMetadata, RAGChunk } from "@/lib/types";
import {
  Layers,
  Sparkles,
  Database,
  ArrowRight,
  Clock,
  Sliders,
  FileText,
  Copy,
  Check,
  Binary,
  CheckCircle2,
  Info,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface RAGTransparencyPanelProps {
  metadata?: RAGMetadata | null;
  isOpen: boolean;
  onClose?: () => void;
}

export default function RAGTransparencyPanel({
  metadata,
  isOpen,
}: RAGTransparencyPanelProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (!metadata || !metadata.retrieved_chunks || metadata.retrieved_chunks.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: "auto" }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.3 }}
        className="mt-3 p-4 rounded-xl text-xs flex items-center gap-2"
        style={{
          background: "var(--bg-tertiary)",
          border: "1px solid var(--border)",
          color: "var(--text-muted)",
        }}
      >
        <Info className="w-4 h-4 text-amber-500 shrink-0" />
        <span>Retrieval metadata unavailable.</span>
      </motion.div>
    );
  }

  const {
    session_id,
    query_id,
    timestamp,
    configuration,
    summary,
    retrieved_chunks,
    used_duckdb,
  } = metadata;

  // Flow step names & descriptions (Requirement 8)
  const defaultFlow = [
    { step: 1, name: "User Query", desc: summary?.query ? `"${summary.query.slice(0, 30)}..."` : "Input received" },
    { step: 2, name: "Embedding", desc: configuration?.embedding_model ? configuration.embedding_model.split(" ")[0] : "Vectorization" },
    { step: 3, name: "Vector Search", desc: `Scanned ${summary?.total_chunks_indexed ?? "N/A"} chunks` },
    { step: 4, name: "Retrieved Chunks", desc: `Top ${summary?.chunks_retrieved ?? retrieved_chunks.length} selected` },
    { step: 5, name: "LLM", desc: "Augmented inference" },
    { step: 6, name: "Answer", desc: "Grounded result" },
  ];

  const flowSteps = metadata.flow && metadata.flow.length > 0 ? metadata.flow : defaultFlow;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0, y: -6 }}
      animate={{ opacity: 1, height: "auto", y: 0 }}
      exit={{ opacity: 0, height: 0, y: -6 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="mt-3.5 rounded-2xl overflow-hidden shadow-lg border"
      style={{
        background: "var(--surface)",
        borderColor: "var(--border)",
        backdropFilter: "blur(12px)",
      }}
    >
      {/* ── PANEL HEADER ── */}
      <div
        className="px-4 py-3 flex flex-wrap items-center justify-between gap-2 border-b"
        style={{
          background: "var(--bg-tertiary)",
          borderColor: "var(--border)",
        }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded-lg flex items-center justify-center"
            style={{ background: "var(--accent-light)", color: "var(--accent-soft)" }}
          >
            <Layers className="w-3.5 h-3.5" />
          </div>
          <span className="font-semibold text-xs tracking-wide uppercase" style={{ color: "var(--text-primary)" }}>
            RAG Transparency & Retrieval Trace
          </span>
        </div>

        {/* Dual / Single Source Badges (Requirement: show if both RAG + DuckDB were used) */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {used_duckdb && (
            <span
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border"
              style={{
                background: "rgba(56, 189, 248, 0.12)",
                color: "#0284c7",
                borderColor: "rgba(56, 189, 248, 0.3)",
              }}
            >
              <Database className="w-3 h-3" />
              DuckDB Executed
            </span>
          )}
          <span
            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border"
            style={{
              background: "var(--accent-light)",
              color: "var(--accent-soft)",
              borderColor: "var(--border-hover)",
            }}
          >
            <Sparkles className="w-3 h-3" />
            RAG Augmented
          </span>
        </div>
      </div>

      <div className="p-4 space-y-4 text-xs">
        {/* ── 1. RAG FLOW PIPELINE (Requirement 8) ── */}
        <div>
          <div className="flex items-center gap-1.5 mb-2 font-medium" style={{ color: "var(--text-secondary)" }}>
            <Binary className="w-3.5 h-3.5 text-[var(--accent-soft)]" />
            <span>Execution Pipeline Flow</span>
          </div>

          <div
            className="p-3 rounded-xl border overflow-x-auto"
            style={{
              background: "var(--bg-primary)",
              borderColor: "var(--border)",
            }}
          >
            <div className="flex items-center gap-1 min-w-[540px]">
              {flowSteps.map((step, idx) => (
                <React.Fragment key={idx}>
                  <div
                    className="flex-1 p-2 rounded-lg border text-center transition-all hover:border-[var(--accent-soft)]"
                    style={{
                      background: "var(--bg-tertiary)",
                      borderColor: "var(--border)",
                    }}
                  >
                    <div className="font-semibold text-[11px]" style={{ color: "var(--text-primary)" }}>
                      {step.name}
                    </div>
                    <div className="text-[10px] truncate mt-0.5" style={{ color: "var(--text-muted)" }}>
                      {step.desc}
                    </div>
                  </div>
                  {idx < flowSteps.length - 1 && (
                    <ArrowRight className="w-3.5 h-3.5 shrink-0 opacity-40 mx-0.5" style={{ color: "var(--accent-soft)" }} />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>

        {/* ── 2. METADATA & CONFIGURATION GRID (Requirements 5, 6, 7) ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Session Information (Requirement 5) */}
          <div
            className="p-3 rounded-xl border space-y-1.5"
            style={{ background: "var(--bg-primary)", borderColor: "var(--border)" }}
          >
            <div className="flex items-center gap-1.5 font-semibold text-[11px] mb-2" style={{ color: "var(--text-primary)" }}>
              <Clock className="w-3 h-3 text-[var(--accent-soft)]" />
              <span>Session Information</span>
            </div>

            <div className="flex items-center justify-between text-[11px]">
              <span style={{ color: "var(--text-muted)" }}>Session ID:</span>
              <span className="font-mono truncate max-w-[170px]" title={session_id} style={{ color: "var(--text-primary)" }}>
                {session_id}
              </span>
            </div>

            <div className="flex items-center justify-between text-[11px]">
              <span style={{ color: "var(--text-muted)" }}>Query ID:</span>
              <span className="font-mono truncate max-w-[170px]" title={query_id} style={{ color: "var(--text-primary)" }}>
                {query_id}
              </span>
            </div>

            <div className="flex items-center justify-between text-[11px]">
              <span style={{ color: "var(--text-muted)" }}>Timestamp:</span>
              <span className="font-mono" style={{ color: "var(--text-primary)" }}>
                {timestamp ? new Date(timestamp).toLocaleString() : "Just now"}
              </span>
            </div>
          </div>

          {/* RAG Configuration & Retrieval Summary (Requirements 6, 7) */}
          <div
            className="p-3 rounded-xl border space-y-1.5"
            style={{ background: "var(--bg-primary)", borderColor: "var(--border)" }}
          >
            <div className="flex items-center gap-1.5 font-semibold text-[11px] mb-2" style={{ color: "var(--text-primary)" }}>
              <Sliders className="w-3 h-3 text-[var(--accent-soft)]" />
              <span>RAG Configuration & Retrieval Summary</span>
            </div>

            <div className="flex items-center justify-between text-[11px]">
              <span style={{ color: "var(--text-muted)" }}>Embedding Model:</span>
              <span className="font-medium truncate max-w-[170px]" title={configuration?.embedding_model} style={{ color: "var(--text-primary)" }}>
                {configuration?.embedding_model || "Google Gemini"}
              </span>
            </div>

            <div className="flex items-center justify-between text-[11px]">
              <span style={{ color: "var(--text-muted)" }}>Vector Database:</span>
              <span className="font-medium truncate max-w-[170px]" title={configuration?.vector_db} style={{ color: "var(--text-primary)" }}>
                {configuration?.vector_db || "HeliXpert Vector Store"}
              </span>
            </div>

            <div className="flex items-center justify-between text-[11px]">
              <span style={{ color: "var(--text-muted)" }}>Top-K / Threshold:</span>
              <span className="font-mono font-medium" style={{ color: "var(--text-primary)" }}>
                k={configuration?.top_k ?? 3} · min={configuration?.similarity_threshold ?? 0.5}
              </span>
            </div>

            <div className="flex items-center justify-between text-[11px] pt-0.5 border-t" style={{ borderColor: "var(--border)" }}>
              <span style={{ color: "var(--text-muted)" }}>Chunks Retrieved:</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                {summary?.chunks_retrieved ?? retrieved_chunks.length} of {summary?.total_chunks_indexed ?? "N/A"} indexed
              </span>
            </div>
          </div>
        </div>

        {/* ── 3. RETRIEVED CHUNKS LIST (Requirements 1, 2, 3, 4) ── */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 font-medium" style={{ color: "var(--text-secondary)" }}>
              <FileText className="w-3.5 h-3.5 text-[var(--accent-soft)]" />
              <span>Retrieved Chunks ({retrieved_chunks.length})</span>
            </div>
            <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
              Ranked by Vector Cosine Similarity
            </span>
          </div>

          {/* ── Rule 8: Contextual Relevance Disclaimer ── */}
          <div
            className="mb-2.5 p-2.5 rounded-xl flex items-center gap-2 border text-[11px]"
            style={{
              background: "rgba(245, 158, 11, 0.08)",
              borderColor: "rgba(245, 158, 11, 0.25)",
              color: "var(--text-secondary)",
            }}
          >
            <Info className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span>
              <strong>Notice:</strong> Retrieved for contextual relevance; not used as the source of the numerical result.
            </span>
          </div>

          <div className="space-y-2.5">
            {retrieved_chunks.map((chunk: RAGChunk) => {
              const scorePct = Math.round(chunk.similarity_score * 100);
              const scoreColor =
                scorePct >= 75
                  ? "#10b981"
                  : scorePct >= 60
                  ? "#38bdf8"
                  : "#f59e0b";

              return (
                <div
                  key={chunk.chunk_id}
                  className="p-3 rounded-xl border transition-all"
                  style={{
                    background: "var(--bg-primary)",
                    borderColor: "var(--border)",
                  }}
                >
                  {/* Chunk Metadata Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      {/* Rank (Requirement 4) */}
                      <span
                        className="px-2 py-0.5 rounded-md font-bold text-[10px] border"
                        style={{
                          background: "var(--accent-light)",
                          color: "var(--accent-soft)",
                          borderColor: "var(--border-hover)",
                        }}
                      >
                        Rank #{chunk.rank}
                      </span>

                      {/* Chunk ID (Requirement 4) */}
                      <span className="font-mono text-[11px] font-medium" style={{ color: "var(--text-primary)" }}>
                        {chunk.chunk_id}
                      </span>

                      {/* Copy Chunk ID button */}
                      <button
                        onClick={() => handleCopy(chunk.chunk_id, chunk.chunk_id)}
                        className="p-1 rounded hover:bg-[var(--bg-tertiary)] transition-colors"
                        title="Copy Chunk ID"
                      >
                        {copiedId === chunk.chunk_id ? (
                          <Check className="w-3 h-3 text-emerald-500" />
                        ) : (
                          <Copy className="w-3 h-3 text-[var(--text-muted)]" />
                        )}
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Source & Row/Location (Requirement 3) */}
                      <span
                        className="px-2 py-0.5 rounded-md text-[10px] font-medium border"
                        style={{
                          background: "var(--bg-tertiary)",
                          color: "var(--text-secondary)",
                          borderColor: "var(--border)",
                        }}
                      >
                        {chunk.source} · {chunk.location}
                      </span>

                      {/* Similarity Score (Requirement 2) */}
                      <span
                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold"
                        style={{
                          background: `${scoreColor}18`,
                          color: scoreColor,
                        }}
                      >
                        Score: {chunk.similarity_score.toFixed(4)} ({scorePct}%)
                      </span>
                    </div>
                  </div>

                  {/* Actual Text Chunk (Requirement 1) */}
                  <div
                    className="p-2.5 rounded-lg font-mono text-[11px] leading-relaxed border select-text"
                    style={{
                      background: "var(--bg-secondary)",
                      borderColor: "var(--border)",
                      color: "var(--text-primary)",
                    }}
                  >
                    {chunk.content}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
