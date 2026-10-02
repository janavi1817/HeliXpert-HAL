"use client";

import React, { useState } from "react";
import { uploadImageFile, analyzeImage } from "@/lib/api";
import { ImageAnalysisResponse } from "@/lib/types";
import {
  X,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Eye,
  Cpu,
  Layers,
  Sparkles,
  RefreshCw,
  Database,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ImageUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  datasetId?: string;
  datasetName?: string;
}

export default function ImageUploadModal({
  isOpen,
  onClose,
  datasetId,
  datasetName,
}: ImageUploadModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<ImageAnalysisResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [userQuestion, setUserQuestion] = useState("");
  const [dragActive, setDragActive] = useState(false);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (file: File) => {
    const validExts = [".jpg", ".jpeg", ".png", ".webp"];
    const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
    if (!validExts.includes(ext)) {
      setErrorMsg("Please upload a valid image file (JPG, PNG, WEBP).");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setErrorMsg("Image exceeds 20 MB limit.");
      return;
    }
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setAnalysisResult(null);
    setErrorMsg(null);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === "dragenter" || e.type === "dragover");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleUseSampleImage = async () => {
    try {
      const res = await fetch("/sample_helicopter.png");
      const blob = await res.blob();
      const file = new File([blob], "sample_helicopter.png", { type: "image/png" });
      setSelectedFile(file);
      setPreviewUrl("/sample_helicopter.png");
      setAnalysisResult(null);
      setErrorMsg(null);
    } catch (err) {
      setErrorMsg("Failed to load sample helicopter image.");
    }
  };

  const handleRunAnalysis = async () => {
    if (!selectedFile) return;
    setIsAnalyzing(true);
    setErrorMsg(null);

    try {
      // 1. Upload
      const uploaded = await uploadImageFile(selectedFile);
      // 2. Analyze
      const result = await analyzeImage(uploaded.id, datasetId, userQuestion);
      setAnalysisResult(result);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to analyze image. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setAnalysisResult(null);
    setErrorMsg(null);
    setUserQuestion("");
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
        className="relative w-full max-w-lg rounded-3xl p-6 space-y-5 max-h-[90vh] overflow-y-auto"
        style={{
          background: "var(--bg-secondary)",
          border: "1px solid var(--border-hover)",
          boxShadow: "var(--shadow-xl)",
        }}
      >
        {/* Header - Matching reference style */}
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
              <ImageIcon className="w-5 h-5" style={{ color: "var(--accent)" }} />
            </div>
            <div>
              <h3 className="font-bold text-base" style={{ color: "var(--text-primary)" }}>
                Upload Image
              </h3>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                JPG, PNG, WEBP · Max 20 MB
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
            style={{
              color: "var(--text-muted)",
              background: "var(--bg-tertiary)",
            }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error Alert */}
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

        {/* Upload or Preview Section */}
        {!previewUrl ? (
          <div className="space-y-4">
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => document.getElementById("helicopter-image-input")?.click()}
              className="upload-zone flex flex-col items-center justify-center p-10 text-center transition-all cursor-pointer rounded-3xl"
              style={{
                background: dragActive ? "var(--accent-light)" : "var(--bg-tertiary)",
                border: dragActive
                  ? "2px dashed var(--accent)"
                  : "2px dashed var(--border-hover)",
              }}
            >
              <input
                id="helicopter-image-input"
                type="file"
                accept=".jpg,.jpeg,.png,.webp"
                className="hidden"
                onChange={handleFileChange}
              />
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                style={{
                  background: "var(--accent-light)",
                  border: "1px solid var(--border-hover)",
                }}
              >
                <ImageIcon className="w-7 h-7" style={{ color: "var(--accent-soft)" }} />
              </div>
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
            </div>

            {/* Quick Demo Sample Image button */}
            <div className="space-y-3">
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
                onClick={handleUseSampleImage}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-full text-xs font-medium transition-all"
                style={{
                  background: "var(--bg-tertiary)",
                  border: "1px solid var(--border-hover)",
                  color: "var(--accent)",
                }}
              >
                <Sparkles className="w-4 h-4" style={{ color: "var(--accent)" }} />
                <span>Use Sample HAL Helicopter Image</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Image Preview Card */}
            <div
              className="relative rounded-2xl overflow-hidden p-2 flex items-center justify-center max-h-56"
              style={{
                background: "var(--bg-tertiary)",
                border: "1px solid var(--border)",
              }}
            >
              <img
                src={previewUrl}
                alt="Helicopter Preview"
                className="max-h-52 w-auto object-contain rounded-xl"
              />
              <button
                onClick={handleReset}
                className="absolute top-4 right-4 p-1.5 rounded-full shadow-md text-white transition-colors"
                style={{ background: "rgba(0,0,0,0.6)" }}
                title="Remove Image"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Custom Question input */}
            <div className="space-y-1.5">
              <label
                className="text-xs font-medium"
                style={{ color: "var(--text-secondary)" }}
              >
                Analysis Question (Optional)
              </label>
              <input
                type="text"
                value={userQuestion}
                onChange={(e) => setUserQuestion(e.target.value)}
                placeholder="e.g., Does this correspond to any helicopter in my fleet dataset?"
                className="w-full px-3.5 py-2.5 rounded-xl text-xs transition-all focus:outline-none"
                style={{
                  background: "var(--bg-tertiary)",
                  border: "1px solid var(--border)",
                  color: "var(--text-primary)",
                }}
              />
            </div>

            {/* Run Analysis Button */}
            {!analysisResult && (
              <button
                onClick={handleRunAnalysis}
                disabled={isAnalyzing}
                className="btn-primary w-full justify-center py-3 text-sm rounded-full"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Analyzing Image & Cross-Referencing...</span>
                  </>
                ) : (
                  <>
                    <Cpu className="w-4 h-4" />
                    <span>Analyze Image with Vision AI</span>
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {/* AI Analysis Results */}
        {analysisResult && (
          <div
            className="p-4 rounded-2xl space-y-4 text-xs animate-fade-in"
            style={{
              background: "var(--bg-tertiary)",
              border: "1px solid var(--border-hover)",
            }}
          >
            {/* Model & Manufacturer Badges */}
            <div
              className="flex flex-wrap items-center justify-between gap-2 pb-3"
              style={{ borderBottom: "1px solid var(--border)" }}
            >
              <div>
                <span
                  className="text-[10px] uppercase font-mono tracking-wider font-semibold"
                  style={{ color: "var(--accent)" }}
                >
                  Identified Airframe
                </span>
                <h4
                  className="text-base font-bold"
                  style={{ color: "var(--text-primary)" }}
                >
                  {analysisResult.vision_analysis.identified_model || "Aerospace Rotorcraft"}
                </h4>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className="px-2.5 py-1 rounded-full text-[11px] font-medium"
                  style={{
                    background: "var(--accent-light)",
                    color: "var(--accent)",
                    border: "1px solid var(--border-hover)",
                  }}
                >
                  Confidence: {analysisResult.vision_analysis.confidence || "High"}
                </span>
              </div>
            </div>

            {/* Visible Components List */}
            {analysisResult.vision_analysis.visible_components && (
              <div className="space-y-1.5">
                <span
                  className="text-[10px] uppercase font-semibold"
                  style={{ color: "var(--text-muted)" }}
                >
                  Visible Aerospace Components:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {analysisResult.vision_analysis.visible_components.map((comp, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-full text-[11px] font-medium"
                      style={{
                        background: "var(--bg-secondary)",
                        border: "1px solid var(--border)",
                        color: "var(--text-secondary)",
                      }}
                    >
                      {comp}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Detailed Assessment */}
            <div
              className="p-3.5 rounded-xl leading-relaxed"
              style={{
                background: "var(--bg-secondary)",
                border: "1px solid var(--border)",
                color: "var(--text-secondary)",
              }}
            >
              <span
                className="font-semibold block mb-1"
                style={{ color: "var(--accent)" }}
              >
                Aerospace Assessment:
              </span>
              {analysisResult.vision_analysis.detailed_analysis}
            </div>

            {/* Dataset Correlation Result */}
            {analysisResult.dataset_correlation && (
              <div
                className="p-3.5 rounded-xl space-y-2"
                style={{
                  background: "var(--accent-light)",
                  border: "1px solid var(--border-hover)",
                }}
              >
                <div
                  className="flex items-center gap-2 font-semibold"
                  style={{ color: "var(--accent)" }}
                >
                  <Database className="w-4 h-4" />
                  <span>Fleet Dataset Correlation:</span>
                </div>
                <p style={{ color: "var(--text-secondary)" }}>
                  {analysisResult.dataset_correlation.summary}
                </p>

                {analysisResult.dataset_correlation.matching_fleet_candidates?.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <span
                      className="text-[10px] uppercase font-semibold"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Matching Fleet Records:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {analysisResult.dataset_correlation.matching_fleet_candidates.map(
                        (cand, ci) => (
                          <div
                            key={ci}
                            className="p-2.5 rounded-xl flex justify-between items-center text-[11px]"
                            style={{
                              background: "var(--bg-secondary)",
                              border: "1px solid var(--border)",
                            }}
                          >
                            <div>
                              <span
                                className="font-bold block"
                                style={{ color: "var(--text-primary)" }}
                              >
                                {cand.model}
                              </span>
                              <span
                                className="text-[10px]"
                                style={{ color: "var(--text-muted)" }}
                              >
                                {cand.helicopter_id} • {cand.manufacturer}
                              </span>
                            </div>
                            <span
                              className="px-2 py-0.5 rounded-full font-mono text-[10px] font-semibold"
                              style={{
                                background: "rgba(16, 185, 129, 0.12)",
                                color: "#10b981",
                                border: "1px solid rgba(16, 185, 129, 0.25)",
                              }}
                            >
                              {cand.match_confidence}
                            </span>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Reset for another image */}
            <button
              onClick={handleReset}
              className="btn-secondary w-full justify-center py-2 text-xs rounded-full mt-2"
            >
              Analyze Another Image
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
