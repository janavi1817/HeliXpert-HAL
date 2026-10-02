"use client";

import React, { useRef, useEffect } from "react";
import { Message, Language } from "@/lib/types";
import MessageItem from "./MessageItem";
import { Database, Image as ImageIcon, Sparkles, Cpu, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";

interface ChatWindowProps {
  messages: Message[];
  isLoading: boolean;
  onOpenDatasetUpload: () => void;
  onOpenImageUpload: () => void;
  onDemoPromptClick: (text: string) => void;
  hasDataset: boolean;
  activeDatasetName?: string;
  language: Language;
}

const QUICK_PROMPTS = [
  "How many helicopters are in this dataset?",
  "Which manufacturer has the most helicopters?",
  "What is the average flight hour?",
  "Show me active helicopters.",
];

const CAPABILITIES = [
  {
    icon: Database,
    title: "Text-to-SQL Analytics",
    desc: "Queries DuckDB with verified read-only SQL. Zero hallucinations.",
    color: "var(--accent-soft)",
  },
  {
    icon: Cpu,
    title: "Vision Airframe AI",
    desc: "Inspects rotor assemblies, landing gear, engine cowling and more.",
    color: "#10b981",
  },
  {
    icon: ShieldCheck,
    title: "Multilingual & Voice",
    desc: "English, हिन्दी (Hindi), and ಕನ್ನಡ (Kannada) supported.",
    color: "#f59e0b",
  },
];

function GreetingBlock({
  hasDataset,
  activeDatasetName,
  onOpenDatasetUpload,
  onOpenImageUpload,
  onDemoPromptClick,
}: Omit<ChatWindowProps, "messages" | "isLoading" | "language">) {
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="w-full max-w-3xl mx-auto py-10 space-y-8"
    >
      {/* Greeting */}
      <div>
        <h2 className="text-3xl font-bold" style={{ color: "var(--text-primary)" }}>
          {greeting}, Janavi{" "}
          <span className="text-2xl">👋</span>
        </h2>
        <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
          {hasDataset
            ? `Your helidata assistant is ready. Dataset: "${activeDatasetName}"`
            : "Your helicopter data assistant is ready."}
        </p>
      </div>

      {/* Chat input placeholder suggestion */}
      <div
        className="rounded-2xl px-5 py-3.5 text-sm"
        style={{
          background: "var(--bg-tertiary)",
          border: "1px solid var(--border)",
          color: "var(--text-muted)",
        }}
      >
        Ask anything about your dataset...
      </div>

      {/* Quick action buttons */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={onOpenDatasetUpload}
          className="btn-primary text-sm py-2.5 px-5"
        >
          <Database className="w-4 h-4" />
          {hasDataset ? "Change Dataset" : "Upload Dataset"}
        </button>
        <button
          onClick={onOpenImageUpload}
          className="btn-secondary text-sm py-2.5 px-5"
        >
          <ImageIcon className="w-4 h-4" />
          Upload Image
        </button>
      </div>

      {/* Quick prompt chips */}
      <div>
        <p className="text-xs font-semibold mb-3 flex items-center gap-1.5"
           style={{ color: "var(--text-muted)" }}>
          <Sparkles className="w-3.5 h-3.5" style={{ color: "var(--accent-soft)" }} />
          Try asking
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {QUICK_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              onClick={() => onDemoPromptClick(prompt)}
              className="text-left px-4 py-3 rounded-xl text-sm transition-all"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                color: "var(--text-secondary)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = "var(--border-hover)";
                (e.currentTarget as HTMLElement).style.color = "var(--accent-soft)";
                (e.currentTarget as HTMLElement).style.background = "var(--accent-light)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
                (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)";
                (e.currentTarget as HTMLElement).style.background = "var(--surface)";
              }}
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* Capability cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {CAPABILITIES.map(({ icon: Icon, title, desc, color }) => (
          <div
            key={title}
            className="glass-card p-4 space-y-2"
          >
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                 style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
              <Icon className="w-4 h-4" style={{ color }} />
            </div>
            <div className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
              {title}
            </div>
            <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
              {desc}
            </p>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

export default function ChatWindow({
  messages,
  isLoading,
  onOpenDatasetUpload,
  onOpenImageUpload,
  onDemoPromptClick,
  hasDataset,
  activeDatasetName,
  language,
}: ChatWindowProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  return (
    <div className="flex-1 w-full overflow-y-auto px-4 md:px-8 py-6">
      {messages.length === 0 ? (
        <GreetingBlock
          hasDataset={hasDataset}
          activeDatasetName={activeDatasetName}
          onOpenDatasetUpload={onOpenDatasetUpload}
          onOpenImageUpload={onOpenImageUpload}
          onDemoPromptClick={onDemoPromptClick}
        />
      ) : (
        <div className="max-w-3xl mx-auto space-y-3">
          {messages.map((msg) => (
            <MessageItem key={msg.id} message={msg} />
          ))}

          {/* Loading indicator */}
          {isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-3 max-w-md"
            >
              {/* Avatar */}
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                   style={{
                     background: "var(--accent-light)",
                     border: "1px solid var(--border-hover)",
                   }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M12 3L4 8V16L12 21L20 16V8L12 3Z" stroke="var(--accent-soft)"
                        strokeWidth="1.8" strokeLinejoin="round" />
                </svg>
              </div>

              <div className="msg-assistant">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    {[0,1,2].map(i => (
                      <span key={i}
                        className="w-1.5 h-1.5 rounded-full animate-bounce"
                        style={{
                          background: "var(--accent-soft)",
                          animationDelay: `${i * 0.15}s`,
                        }}
                      />
                    ))}
                  </div>
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                    Analyzing...
                  </span>
                </div>
              </div>
            </motion.div>
          )}

          <div ref={bottomRef} />
        </div>
      )}
    </div>
  );
}
