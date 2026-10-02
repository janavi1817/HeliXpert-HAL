"use client";

import React, { useState } from "react";
import { Database, Languages, Terminal, MessageSquare, ChevronDown, Sun, Moon, Bell } from "lucide-react";
import { ChatMode, Language } from "@/lib/types";
import { useTheme } from "@/lib/theme";
import clsx from "clsx";
import { AnimatePresence, motion } from "framer-motion";

interface HeaderProps {
  currentDatasetName?: string;
  rowCount?: number;
  mode: ChatMode;
  setMode: (mode: ChatMode) => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  onOpenDatasetModal: () => void;
  allDatasets?: Dataset[];
  selectedDatasetIds?: string[];
  onToggleDataset?: (id: string) => void;
  onSelectAllDatasets?: () => void;
}

const LANGUAGES: { code: Language; label: string; native: string }[] = [
  { code: "en", label: "English", native: "English" },
  { code: "hi", label: "Hindi",   native: "हिन्दी"  },
  { code: "kn", label: "Kannada", native: "ಕನ್ನಡ"   },
];

export default function Header({
  currentDatasetName,
  rowCount,
  mode,
  setMode,
  language,
  setLanguage,
  onOpenDatasetModal,
  allDatasets = [],
  selectedDatasetIds = [],
  onToggleDataset,
  onSelectAllDatasets,
}: HeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const [langOpen, setLangOpen] = useState(false);
  const [datasetMenuOpen, setDatasetMenuOpen] = useState(false);

  const currentLang = LANGUAGES.find((l) => l.code === language) ?? LANGUAGES[0];
  const selectedCount = selectedDatasetIds.length;
  const totalRows = allDatasets
    .filter((d) => selectedDatasetIds.includes(d.id))
    .reduce((sum, d) => sum + (d.row_count || 0), 0);

  return (
    <header
      className="relative z-10 h-16 px-4 md:px-6 flex items-center justify-between"
      style={{
        background: "var(--surface)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderBottom: "1px solid var(--border)",
        boxShadow: "0 1px 0 var(--border)",
      }}
    >
      {/* ── Left: Multi-Dataset Selector & Injected Manager ── */}
      <div className="relative flex items-center gap-3">
        {allDatasets.length > 0 ? (
          <div>
            <button
              onClick={() => setDatasetMenuOpen(!datasetMenuOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
              style={{
                background: selectedCount > 1 ? "rgba(16, 185, 129, 0.12)" : "var(--accent-light)",
                border: selectedCount > 1 ? "1px solid rgba(16, 185, 129, 0.35)" : "1px solid var(--border-hover)",
                color: selectedCount > 1 ? "#10b981" : "var(--accent-soft)",
              }}
              title="Click to manage injected datasets"
            >
              <Database className="w-3.5 h-3.5" />
              <span className="max-w-[160px] md:max-w-[260px] truncate font-semibold">
                {selectedCount > 1
                  ? `${selectedCount} Datasets Injected`
                  : currentDatasetName || "Select Dataset"}
              </span>
              <span
                className="px-2 py-0.5 rounded-full text-[10px] font-mono"
                style={{
                  background: "var(--bg-tertiary)",
                  color: "var(--text-muted)",
                }}
              >
                {(totalRows || rowCount || 0).toLocaleString()} rows
              </span>
              <ChevronDown className={clsx("w-3 h-3 transition-transform ml-1", datasetMenuOpen && "rotate-180")} />
            </button>

            {/* Dropdown for Injected Datasets Multi-Select */}
            <AnimatePresence>
              {datasetMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.96 }}
                  transition={{ duration: 0.18 }}
                  className="absolute left-0 mt-2 w-80 py-2.5 px-3 rounded-2xl z-50 overflow-hidden space-y-2"
                  style={{
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--border-hover)",
                    boxShadow: "var(--shadow-xl)",
                  }}
                >
                  <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: "var(--border)" }}>
                    <div>
                      <h4 className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>
                        Injected Datasets
                      </h4>
                      <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                        Check 2 or more to query across them together
                      </p>
                    </div>
                    {onSelectAllDatasets && (
                      <button
                        onClick={onSelectAllDatasets}
                        className="text-[10px] font-semibold px-2 py-0.5 rounded hover:underline"
                        style={{ color: "var(--accent-soft)" }}
                      >
                        Select All
                      </button>
                    )}
                  </div>

                  {/* Dataset List with Checkboxes */}
                  <div className="max-h-56 overflow-y-auto space-y-1 pr-1">
                    {allDatasets.map((dataset) => {
                      const isChecked = selectedDatasetIds.includes(dataset.id);
                      return (
                        <div
                          key={dataset.id}
                          onClick={() => onToggleDataset && onToggleDataset(dataset.id)}
                          className="flex items-center justify-between p-2 rounded-xl text-xs cursor-pointer transition-colors"
                          style={{
                            background: isChecked ? "var(--accent-light)" : "var(--bg-tertiary)",
                            border: isChecked ? "1px solid var(--border-hover)" : "1px solid transparent",
                          }}
                        >
                          <div className="flex items-center gap-2 overflow-hidden">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {}} // handled by parent div onClick
                              className="rounded border-gray-500 text-blue-600 focus:ring-0 cursor-pointer"
                            />
                            <div className="truncate">
                              <p className="font-medium truncate" style={{ color: isChecked ? "var(--text-primary)" : "var(--text-secondary)" }}>
                                {dataset.name}
                              </p>
                              <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                                {dataset.row_count?.toLocaleString()} rows
                              </span>
                            </div>
                          </div>
                          {isChecked && (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ background: "rgba(16, 185, 129, 0.15)", color: "#10b981" }}>
                              ACTIVE
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Add Dataset Button */}
                  <div className="pt-2 border-t flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
                    <button
                      onClick={() => {
                        setDatasetMenuOpen(false);
                        onOpenDatasetModal();
                      }}
                      className="w-full btn-primary text-xs py-1.5 px-3 flex items-center justify-center gap-1.5"
                    >
                      <Database className="w-3.5 h-3.5" />
                      Upload / Inject Another Dataset
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <button
            onClick={onOpenDatasetModal}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs transition-all"
            style={{
              background: "var(--bg-tertiary)",
              border: "1px solid var(--border)",
              color: "var(--text-muted)",
            }}
          >
            <Database className="w-3.5 h-3.5" />
            <span>No Dataset · Click to Load</span>
          </button>
        )}
      </div>

      {/* ── Right: Controls ── */}
      <div className="flex items-center gap-2.5">

        {/* Mode pill toggle */}
        <div className="mode-pill">
          <button
            onClick={() => setMode("nlp")}
            className={clsx("mode-pill-btn", mode === "nlp" && "active")}
            title="Natural Language response"
          >
            <span className="flex items-center gap-1.5">
              <MessageSquare className="w-3 h-3" />
              <span className="hidden sm:inline">Natural Language</span>
              <span className="sm:hidden">NLP</span>
            </span>
          </button>
          <button
            onClick={() => setMode("rag")}
            className={clsx("mode-pill-btn", mode === "rag" && "active")}
            title="Data Query (SQL) mode"
          >
            <span className="flex items-center gap-1.5">
              <Terminal className="w-3 h-3" />
              <span className="hidden sm:inline">Data Query</span>
              <span className="sm:hidden">SQL</span>
            </span>
          </button>
        </div>

        {/* Language selector */}
        <div className="relative">
          <button
            onClick={() => setLangOpen(!langOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
            style={{
              background: "var(--bg-tertiary)",
              border: "1px solid var(--border)",
              color: "var(--text-primary)",
            }}
          >
            <Languages className="w-3.5 h-3.5" style={{ color: "var(--accent-soft)" }} />
            <span>{currentLang.native}</span>
            <ChevronDown className={clsx("w-3 h-3 transition-transform", langOpen && "rotate-180")}
                         style={{ color: "var(--text-muted)" }} />
          </button>

          <AnimatePresence>
            {langOpen && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.95 }}
                transition={{ duration: 0.18 }}
                className="absolute right-0 mt-2 w-36 py-1.5 rounded-xl z-50 overflow-hidden"
                style={{
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border-hover)",
                  boxShadow: "var(--shadow-lg)",
                }}
              >
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => { setLanguage(lang.code); setLangOpen(false); }}
                    className="w-full px-3 py-2 text-left text-xs flex items-center justify-between transition-colors"
                    style={{
                      color: language === lang.code ? "var(--accent-soft)" : "var(--text-secondary)",
                      background: language === lang.code ? "var(--accent-light)" : "transparent",
                      fontWeight: language === lang.code ? 600 : 400,
                    }}
                  >
                    <span>{lang.native}</span>
                    <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{lang.label}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
          style={{
            background: "var(--bg-tertiary)",
            border: "1px solid var(--border)",
            color: "var(--text-secondary)",
          }}
          title="Toggle theme"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={theme}
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {theme === "dark"
                ? <Sun className="w-3.5 h-3.5" />
                : <Moon className="w-3.5 h-3.5" />}
            </motion.div>
          </AnimatePresence>
        </button>
      </div>
    </header>
  );
}
