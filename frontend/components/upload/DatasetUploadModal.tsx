"use client";

import React, { useState } from "react";
import { uploadDatasetFile, loadDemoDataset } from "@/lib/api";
import { Dataset } from "@/lib/types";
import {
  X,
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Database,
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
  "Uploading...",
  "Analyzing schema...",
  "Calculating statistics...",
  "Preparing AI...",
  "Dataset ready!",
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
    const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
    if (![".csv", ".xlsx", ".xls", ".json", ".parquet"].includes(ext)) {
      setErrorMsg(`Unsupported type '${ext}'. Use CSV, XLSX, JSON, or Parquet.`);
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setErrorMsg("File exceeds 50 MB limit.");
      return;
    }
    setSelectedFile(file);
  };

  const processUpload = async (file: File) => {
    setIsProcessing(true);
    setErrorMsg(null);
    setProgressIndex(0);
    const iv = setInterval(() => setProgressIndex((p) => (p < 3 ? p + 1 : p)), 600);
    try {
      const dataset = await uploadDatasetFile(file);
      clearInterval(iv);
      setProgressIndex(4);
      try {
        confetti({ particleCount: 60, spread: 60, origin: { y: 0.6 } });
      } catch {}
      setTimeout(() => {
        onDatasetLoaded(dataset);
        onClose();
        setIsProcessing(false);
        setProgressIndex(-1);
        setSelectedFile(null);
      }, 900);
    } catch (err: any) {
      clearInterval(iv);
      setIsProcessing(false);
      setProgressIndex(-1);
      setErrorMsg(err.message || "Upload failed. Please try again.");
    }
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
      }, 800);
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
              <UploadCloud className="w-5 h-5" style={{ color: "var(--accent)" }} />
            </div>
            <div>
              <h3 className="font-bold text-base" style={{ color: "var(--text-primary)" }}>
                Upload Dataset
              </h3>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                CSV, XLSX, JSON, Parquet · Max 50 MB
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
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

        {/* Error */}
        {errorMsg && (
          <div
            className="flex items-center gap-2 p-3 rounded-2xl text-xs"
            style={{
              background: "rgba(239,68,68,0.08)",
              border: "1px solid rgba(239,68,68,0.25)",
              color: "#ef4444",
            }}
          >
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Drop zone or progress */}
        {!isProcessing ? (
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => document.getElementById("dataset-file-input")?.click()}
            className={clsx(
              "upload-zone flex flex-col items-center justify-center p-10 text-center transition-all cursor-pointer rounded-3xl",
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
              accept=".csv,.xlsx,.xls,.json,.parquet"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) handleFile(e.target.files[0]);
              }}
            />

            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
              style={{
                background: "var(--accent-light)",
                border: "1px solid var(--border-hover)",
              }}
            >
              <FileSpreadsheet className="w-7 h-7" style={{ color: "var(--accent-soft)" }} />
            </div>

            {selectedFile ? (
              <>
                <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                  {selectedFile.name}
                </p>
                <p className="text-xs mt-1" style={{ color: "#10b981" }}>
                  {(selectedFile.size / 1024).toFixed(1)} KB — Ready to upload
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  Drag and drop your file here
                </p>
                <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                  or
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
        {!isProcessing && (
          <div className="space-y-3">
            {selectedFile && (
              <button
                onClick={() => processUpload(selectedFile)}
                className="btn-primary w-full justify-center py-3 text-sm rounded-full"
              >
                Process & Ingest Dataset
              </button>
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
