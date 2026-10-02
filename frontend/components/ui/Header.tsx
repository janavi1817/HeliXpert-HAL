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
}: HeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const [langOpen, setLangOpen] = useState(false);

  const currentLang = LANGUAGES.find((l) => l.code === language) ?? LANGUAGES[0];

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
      {/* ── Left: Dataset selector ── */}
      <div className="flex items-center gap-3">
        {currentDatasetName ? (
          <button
            onClick={onOpenDatasetModal}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
            style={{
              background: "var(--accent-light)",
              border: "1px solid var(--border-hover)",
              color: "var(--accent-soft)",
            }}
            title="Click to change dataset"
          >
            <Database className="w-3.5 h-3.5" />
            <span className="max-w-[160px] md:max-w-[260px] truncate font-semibold">
              {currentDatasetName}
            </span>
            {rowCount !== undefined && (
              <span
                className="px-2 py-0.5 rounded-full text-[10px] font-mono"
                style={{
                  background: "var(--bg-tertiary)",
                  color: "var(--text-muted)",
                }}
              >
                {rowCount.toLocaleString()} rows
              </span>
            )}
          </button>
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
