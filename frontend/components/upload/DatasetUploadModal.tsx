"use client";

import React, { useState } from "react";
import { uploadDatasetFile, loadDemoDataset } from "@/lib/api";
import { Dataset, UploadResponse, ProcessedItem, FailedItem, UnsupportedItem } from "@/lib/types";
import {
  X,
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Database,
  Archive,
  FileText,
  ImageIcon,
  FolderArchive,
  ArrowRight,
  XCircle,
  Plus,
  RefreshCw
} from "lucide-react";
import confetti from "canvas-confetti";
import clsx from "clsx";
import { motion, AnimatePresence } from "framer-motion";

interface DatasetUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDatasetLoaded: (dataset: Dataset) => void;
}

const PROGRESS_STEPS = [
  "Uploading package...",
  "Scanning files recursively...",
  "Ingesting DuckDB tables & RAG...",
  "Configuring dynamic analytics...",
  "Dataset ready!",
];

const ALLOWED_EXTS = [
  ".csv", ".xlsx", ".xls", ".json", ".parquet",
  ".pdf", ".txt", ".docx", ".md",
  ".jpg", ".jpeg", ".png", ".webp",
  ".zip"
];

export default function DatasetUploadModal({
  isOpen,
  onClose,
  onDatasetLoaded,
}: DatasetUploadModalProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgressIndex, setProgressIndex] = useState(-1);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [zipResult, setZipResult] = useState<UploadResponse | null>(null);

  if (!isOpen) return null;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === "dragenter" || e.type === "dragover");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
  };

  const handleFile = (file: File) => {
    setErrorMsg(null);
    setZipResult(null);
    const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
    if (!ALLOWED_EXTS.includes(ext)) {
      setErrorMsg(`Unsupported file type '${ext}'. Supported: CSV, XLSX, JSON, Parquet, PDF, TXT, DOCX, Images, ZIP.`);
      return;
    }
    if (file.size > 500 * 1024 * 1024) {
      setErrorMsg("File exceeds 500 MB limit.");
      return;
    }
    setSelectedFile(file);
  };

  const processUpload = async (file: File) => {
    setIsProcessing(true);
    setErrorMsg(null);
    setProgressIndex(0);
    const iv = setInterval(() => setProgressIndex((p) => (p < 3 ? p + 1 : p)), 500);
    try {
      const res: UploadResponse = await uploadDatasetFile(file);
      clearInterval(iv);
      setProgressIndex(4);
      try {
        confetti({ particleCount: 60, spread: 60, origin: { y: 0.6 } });
      } catch {}

      // Immediately pass newly extracted dataset(s) so dropdown updates instantly
      onDatasetLoaded(res);

      if (res.is_zip || (res.processed && res.processed.length > 1)) {
        setIsProcessing(false);
        setProgressIndex(-1);
        setZipResult(res);
      } else {
        setTimeout(() => {
          onClose();
          setIsProcessing(false);
          setProgressIndex(-1);
          setSelectedFile(null);
        }, 800);
      }
    } catch (err: any) {
      clearInterval(iv);
      setIsProcessing(false);
      setProgressIndex(-1);
      setErrorMsg(err.message || "Upload failed. Please try again.");
    }
  };

  const handleCancelDataset = () => {
    setSelectedFile(null);
    setErrorMsg(null);
    setProgressIndex(-1);
    setIsProcessing(false);
    const input = document.getElementById("dataset-file-input") as HTMLInputElement;
    if (input) input.value = "";
  };

  const handleAddAnotherDataset = () => {
    setSelectedFile(null);
    setErrorMsg(null);
    setProgressIndex(-1);
    setIsProcessing(false);
    const input = document.getElementById("dataset-file-input") as HTMLInputElement;
    if (input) {
      input.value = "";
      setTimeout(() => input.click(), 50);
    }
  };

  const handleFinishZip = () => {
    if (zipResult) {
      onDatasetLoaded(zipResult);
    }
    onClose();
    setZipResult(null);
    setSelectedFile(null);
  };

  const handleLoadDemo = async () => {
    setIsProcessing(true);
    setErrorMsg(null);
    setProgressIndex(1);
    try {
      const dataset = await loadDemoDataset();
      setProgressIndex(4);
      try {
        confetti({ particleCount: 60, spread: 60, origin: { y: 0.6 } });
      } catch {}
      setTimeout(() => {
        onDatasetLoaded(dataset);
        onClose();
        setIsProcessing(false);
        setProgressIndex(-1);
      }, 700);
    } catch (err: any) {
      setIsProcessing(false);
      setProgressIndex(-1);
      setErrorMsg(err.message || "Failed to load demo dataset.");
    }
  };


  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)" }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 16 }}
        className="relative w-full max-w-md rounded-3xl p-6 space-y-5"
        style={{
          background: "var(--bg-secondary)",
          border: "1px solid var(--border-hover)",
          boxShadow: "var(--shadow-xl)",
        }}
      >
        {/* Header matching reference */}
        <div
          className="flex items-center justify-between pb-3"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center"
              style={{
                background: "var(--accent-light)",
                border: "1px solid var(--border-hover)",
              }}
            >
              {zipResult ? (
                <Archive className="w-5 h-5" style={{ color: "var(--accent)" }} />
              ) : (
                <UploadCloud className="w-5 h-5" style={{ color: "var(--accent)" }} />
              )}
            </div>
            <div>
              <h3 className="font-bold text-base" style={{ color: "var(--text-primary)" }}>
                {zipResult ? "Package Extraction Complete" : "Upload Dataset / Package"}
              </h3>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                {zipResult
                  ? `${zipResult.package_name} · ${zipResult.total_files || (zipResult.processed?.length || 0)} files scanned`
                  : "CSV, XLSX, JSON, Parquet, PDF, DOCX, TXT, Images, ZIP · Max 500 MB"}
              </p>
            </div>
          </div>
          <button
            onClick={zipResult ? handleFinishZip : onClose}
            disabled={isProcessing}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
            style={{
              color: "var(--text-muted)",
              background: "var(--bg-tertiary)",
            }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error / Failure Banner with Action Options */}
        {errorMsg && (
          <div
            className="p-3.5 rounded-2xl text-xs space-y-2.5"
            style={{
              background: "rgba(239,68,68,0.08)",
              border: "1px solid rgba(239,68,68,0.25)",
              color: "#ef4444",
            }}
          >
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-semibold block">Dataset Ingestion Issue</span>
                <span className="opacity-90">{errorMsg}</span>
              </div>
            </div>

            {/* Cancel Dataset and Add Another Dataset Buttons */}
            <div className="flex items-center gap-2 pt-1 border-t border-red-500/20 flex-wrap">
              <button
                type="button"
                onClick={handleCancelDataset}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-medium transition-all hover:bg-red-500/20"
                style={{
                  background: "rgba(239,68,68,0.12)",
                  color: "#ef4444",
                  border: "1px solid rgba(239,68,68,0.3)",
                }}
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Cancel Dataset</span>
              </button>

              <button
                type="button"
                onClick={handleAddAnotherDataset}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-semibold transition-all hover:brightness-110 ml-auto"
                style={{
                  background: "var(--accent)",
                  color: "#ffffff",
                }}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Another Dataset</span>
              </button>
            </div>
          </div>
        )}

        {/* ZIP Extraction Report Result */}
        {zipResult ? (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            <div
              className="p-3.5 rounded-2xl text-xs flex items-center justify-between"
              style={{
                background: "rgba(16, 185, 129, 0.08)",
                border: "1px solid rgba(16, 185, 129, 0.25)",
                color: "#10b981",
              }}
            >
              <div className="flex items-center gap-2 font-medium">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>
                  Extracted {zipResult.processed?.length || 0} resources successfully
                </span>
              </div>
              <span className="font-mono text-[10px] px-2 py-0.5 rounded-full"
                    style={{ background: "rgba(16, 185, 129, 0.15)" }}>
                Multi-Resource Package
              </span>
            </div>

            {/* Processed items list */}
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider"
                 style={{ color: "var(--text-muted)" }}>
                Processed Items ({zipResult.processed?.length || 0})
              </p>
              {zipResult.processed && zipResult.processed.length > 0 ? (
                zipResult.processed.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-2xl flex items-center justify-between gap-3 text-xs"
                    style={{
                      background: "var(--bg-tertiary)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                        style={{
                          background: item.type === "dataset" ? "var(--accent-light)" : item.type === "document" ? "rgba(59, 130, 246, 0.12)" : "rgba(245, 158, 11, 0.12)",
                          border: "1px solid var(--border-hover)",
                        }}
                      >
                        {item.type === "dataset" ? (
                          <FileSpreadsheet className="w-4 h-4" style={{ color: "var(--accent)" }} />
                        ) : item.type === "document" ? (
                          <FileText className="w-4 h-4 text-blue-500" />
                        ) : (
                          <ImageIcon className="w-4 h-4 text-amber-500" />
                        )}
                      </div>
                      <div className="truncate">
                        <p className="font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                          {item.filename}
                        </p>
                        <p className="text-[10px] truncate" style={{ color: "var(--text-muted)" }}>
                          {item.type === "dataset"
                            ? `${item.row_count || 0} rows · ${item.column_count || 0} cols · DuckDB table created`
                            : item.type === "document"
                            ? `${item.chunks_indexed || 0} chunks indexed in RAG`
                            : "Vision airframe analysis ready"}
                        </p>
                      </div>
                    </div>

                    <span
                      className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full shrink-0 font-semibold"
                      style={{
                        background: item.type === "dataset" ? "var(--accent-light)" : item.type === "document" ? "rgba(59,130,246,0.15)" : "rgba(245,158,11,0.15)",
                        color: item.type === "dataset" ? "var(--accent)" : item.type === "document" ? "#3b82f6" : "#f59e0b",
                      }}
                    >
                      {item.type}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  No files were processed.
                </p>
              )}
            </div>

            {/* Failed items list */}
            {zipResult.failed && zipResult.failed.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-red-500">
                  Failed Files ({zipResult.failed.length})
                </p>
                {zipResult.failed.map((f, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl flex items-center justify-between text-xs"
                    style={{
                      background: "rgba(239, 68, 68, 0.08)",
                      border: "1px solid rgba(239, 68, 68, 0.2)",
                      color: "#ef4444",
                    }}
                  >
                    <span className="font-semibold truncate">{f.filename}</span>
                    <span className="text-[10px] truncate">{f.reason}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Unsupported items list */}
            {zipResult.unsupported && zipResult.unsupported.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <p className="text-[11px] font-semibold uppercase tracking-wider"
                   style={{ color: "var(--text-muted)" }}>
                  Unsupported Files ({zipResult.unsupported.length})
                </p>
                {zipResult.unsupported.map((u, idx) => (
                  <div
                    key={idx}
                    className="p-2 rounded-xl flex items-center justify-between text-[11px]"
                    style={{
                      background: "var(--bg-tertiary)",
                      border: "1px solid var(--border)",
                      color: "var(--text-muted)",
                    }}
                  >
                    <span className="truncate">{u.filename}</span>
                    <span className="text-[10px]">{u.reason}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Finish action */}
            <div className="pt-2">
              <button
                onClick={handleFinishZip}
                className="btn-primary w-full justify-center py-3 text-sm rounded-full flex items-center gap-2"
              >
                <span>Launch Analytics Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : !isProcessing ? (
          /* Drop zone or progress */
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => document.getElementById("dataset-file-input")?.click()}
            className={clsx(
              "upload-zone flex flex-col items-center justify-center p-8 text-center transition-all cursor-pointer rounded-3xl",
              dragActive && "drag-over"
            )}
            style={{
              background: dragActive ? "var(--accent-light)" : "var(--bg-tertiary)",
              border: dragActive
                ? "2px dashed var(--accent)"
                : "2px dashed var(--border-hover)",
            }}
          >
            <input
              id="dataset-file-input"
              type="file"
              accept=".csv,.xlsx,.xls,.json,.parquet,.pdf,.txt,.docx,.md,.jpg,.jpeg,.png,.webp,.zip"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) handleFile(e.target.files[0]);
              }}
            />

            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3"
              style={{
                background: "var(--accent-light)",
                border: "1px solid var(--border-hover)",
              }}
            >
              {selectedFile?.name.toLowerCase().endsWith(".zip") ? (
                <Archive className="w-7 h-7" style={{ color: "var(--accent-soft)" }} />
              ) : (
                <FileSpreadsheet className="w-7 h-7" style={{ color: "var(--accent-soft)" }} />
              )}
            </div>

            {selectedFile ? (
              <div className="space-y-1">
                <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                  {selectedFile.name}
                </p>
                <p className="text-xs" style={{ color: errorMsg ? "#ef4444" : "#10b981" }}>
                  {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB — {errorMsg ? "Upload failed" : "Ready to upload"}
                </p>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCancelDataset();
                  }}
                  className="mt-2 text-[11px] px-2.5 py-1 rounded-lg transition-colors inline-flex items-center gap-1 font-medium hover:bg-red-500/20"
                  style={{
                    background: "rgba(239,68,68,0.1)",
                    color: "#ef4444",
                    border: "1px solid rgba(239,68,68,0.25)",
                  }}
                  title="Cancel selected dataset"
                >
                  <XCircle className="w-3 h-3" />
                  <span>Cancel Dataset</span>
                </button>
              </div>
            ) : (
              <>
                <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  Drag & drop single dataset or ZIP package
                </p>
                <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                  Supports CSV, XLSX, JSON, Parquet, PDF, DOCX, TXT, Images, ZIP
                </p>
                <button
                  type="button"
                  className="btn-secondary mt-3 text-xs py-2 px-6 rounded-full"
                >
                  Browse Files
                </button>
              </>
            )}
          </div>
        ) : (
          <div
            className="p-5 rounded-3xl space-y-4"
            style={{ background: "var(--bg-tertiary)", border: "1px solid var(--border)" }}
          >
            <div
              className="flex items-center gap-2 text-sm font-semibold"
              style={{ color: "var(--accent-soft)" }}
            >
              <Loader2 className="w-4 h-4 animate-spin" />
              {PROGRESS_STEPS[Math.max(0, uploadProgressIndex)]}
            </div>
            <div className="progress-bar">
              <div
                className="progress-bar-fill"
                style={{
                  width: `${((uploadProgressIndex + 1) / PROGRESS_STEPS.length) * 100}%`,
                }}
              />
            </div>
            <div className="space-y-2">
              {PROGRESS_STEPS.map((step, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 text-xs transition-all"
                  style={{
                    color: i <= uploadProgressIndex ? "var(--accent-soft)" : "var(--text-muted)",
                    opacity: i <= uploadProgressIndex ? 1 : 0.5,
                  }}
                >
                  <CheckCircle2
                    className="w-3.5 h-3.5 shrink-0"
                    style={{
                      color: i <= uploadProgressIndex ? "#10b981" : "var(--text-muted)",
                    }}
                  />
                  {step}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        {!isProcessing && !zipResult && (
          <div className="space-y-3">
            {selectedFile && !errorMsg && (
              <button
                onClick={() => processUpload(selectedFile)}
                className="btn-primary w-full justify-center py-3 text-sm rounded-full"
              >
                {selectedFile.name.toLowerCase().endsWith(".zip")
                  ? "Extract & Process ZIP Package"
                  : "Process & Ingest Dataset"}
              </button>
            )}

            {selectedFile && errorMsg && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCancelDataset}
                  className="btn-secondary flex-1 justify-center py-2.5 text-xs rounded-full flex items-center gap-1.5"
                  style={{ borderColor: "rgba(239,68,68,0.3)", color: "#ef4444" }}
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Cancel Dataset</span>
                </button>
                <button
                  type="button"
                  onClick={handleAddAnotherDataset}
                  className="btn-primary flex-1 justify-center py-2.5 text-xs rounded-full flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Another Dataset</span>
                </button>
              </div>
            )}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
              <span
                className="text-[11px] uppercase tracking-wider"
                style={{ color: "var(--text-muted)" }}
              >
                or demo
              </span>
              <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
            </div>
            <button
              onClick={handleLoadDemo}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-full text-xs font-medium transition-all"
              style={{
                background: "var(--bg-tertiary)",
                border: "1px solid var(--border-hover)",
                color: "var(--accent)",
              }}
            >
              <Database className="w-3.5 h-3.5" style={{ color: "var(--accent)" }} />
              Load HAL Helicopter Fleet Dataset (120 records)
            </button>
          </div>
        )}

      </motion.div>
    </div>
  );
}
