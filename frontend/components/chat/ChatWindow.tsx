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
  activeDatasetNames?: string[];
  language: Language;
  suggestedPrompts?: string[];
  isLoadingPrompts?: boolean;
}

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
  activeDatasetNames,
  onOpenDatasetUpload,
  onOpenImageUpload,
  onDemoPromptClick,
  suggestedPrompts = [],
  isLoadingPrompts = false,
  language,
}: Omit<ChatWindowProps, "messages" | "isLoading">) {
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const numDatasets = activeDatasetNames?.length || (hasDataset ? 1 : 0);

  const displayPrompts = suggestedPrompts.length > 0 ? suggestedPrompts : [
    language === "hi" ? "डेटासेट में कितने हेलीकॉप्टर हैं?" : language === "kn" ? "ಈ ಡೇಟಾಸೆಟ್‌ನಲ್ಲಿ ಎಷ್ಟು ಹೆಲಿಕಾಪ್ಟರ್‌ಗಳಿವೆ?" : "How many helicopters are in this dataset?",
    language === "hi" ? "शीर्ष 5 निर्माताओं की सूची दिखाएं।" : language === "kn" ? "ಟಾಪ್ 5 ತಯಾರಕರ ಪಟ್ಟಿಯನ್ನು ತೋರಿಸಿ." : "Show the top 5 manufacturers.",
    language === "hi" ? "कुल घटनाओं की संख्या क्या है?" : language === "kn" ? "ಒಟ್ಟು ಘಟನೆಗಳ ಸಂಖ್ಯೆ ಎಷ್ಟು?" : "What is the total number of incidents?",
    language === "hi" ? "सक्रिय हेलीकॉप्टरों का विवरण दें।" : language === "kn" ? "ಸಕ್ರಿಯ ಹೆಲಿಕಾಪ್ಟರ್‌ಗಳನ್ನು ತೋರಿಸಿ." : "Show me active helicopters.",
  ];

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
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {numDatasets > 1 ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                  style={{ background: "rgba(16, 185, 129, 0.15)", color: "#10b981", border: "1px solid rgba(16, 185, 129, 0.3)" }}>
              <Database className="w-3.5 h-3.5" />
              {numDatasets} Datasets Injected Simultaneously ({activeDatasetNames?.join(", ")})
            </span>
          ) : hasDataset ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                  style={{ background: "var(--accent-light)", color: "var(--accent-soft)", border: "1px solid var(--border-hover)" }}>
              <Database className="w-3.5 h-3.5" />
              Active Dataset: "{activeDatasetName}"
            </span>
          ) : (
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Your helicopter data assistant is ready.
            </p>
          )}
        </div>
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
        {numDatasets > 1
          ? "Ask any question across your injected datasets — text-to-SQL will query the right tables automatically..."
          : "Ask anything about your dataset..."}
      </div>

      {/* Quick action buttons */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={onOpenDatasetUpload}
          className="btn-primary text-sm py-2.5 px-5 flex items-center gap-2"
        >
          <Database className="w-4 h-4" />
          {hasDataset ? "Manage / Inject Datasets" : "Upload Dataset"}
        </button>
        <button
          onClick={onOpenImageUpload}
          className="btn-secondary text-sm py-2.5 px-5 flex items-center gap-2"
        >
          <ImageIcon className="w-4 h-4" />
          Upload Image
        </button>
      </div>

      {/* Dynamic Suggested Prompts */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold flex items-center gap-1.5"
             style={{ color: "var(--text-muted)" }}>
            <Sparkles className="w-3.5 h-3.5" style={{ color: "var(--accent-soft)" }} />
            {hasDataset ? "Dynamic Questions from Your Dataset Schema" : "Suggested questions"}
          </p>
          {hasDataset && (
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full"
                  style={{ background: "var(--bg-tertiary)", color: "var(--accent-soft)" }}>
              Dynamic Prompts
            </span>
          )}
        </div>

        {isLoadingPrompts ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 animate-pulse">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-14 rounded-xl" style={{ background: "var(--surface)", border: "1px solid var(--border)" }} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {displayPrompts.map((prompt, idx) => (
              <button
                key={`${prompt}-${idx}`}
                onClick={() => onDemoPromptClick(prompt)}
                className="text-left px-4 py-3 rounded-xl text-sm transition-all flex items-start justify-between group"
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
                <span className="leading-snug">{prompt}</span>
                <Sparkles className="w-3.5 h-3.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity ml-2 mt-0.5"
                          style={{ color: "var(--accent-soft)" }} />
              </button>
            ))}
          </div>
        )}
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
  activeDatasetNames,
  language,
  suggestedPrompts = [],
  isLoadingPrompts = false,
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
          activeDatasetNames={activeDatasetNames}
          onOpenDatasetUpload={onOpenDatasetUpload}
          onOpenImageUpload={onOpenImageUpload}
          onDemoPromptClick={onDemoPromptClick}
          suggestedPrompts={suggestedPrompts}
          isLoadingPrompts={isLoadingPrompts}
          language={language}
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

          {/* Subtle follow-up dynamic prompt pills */}
          {!isLoading && suggestedPrompts.length > 0 && (
            <div className="pt-3 pb-1">
              <div className="flex items-center gap-1.5 mb-2 text-[11px] font-medium" style={{ color: "var(--text-muted)" }}>
                <Sparkles className="w-3 h-3" style={{ color: "var(--accent-soft)" }} />
                <span>Dynamic Dataset Prompts:</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {suggestedPrompts.slice(0, 3).map((prompt, i) => (
                  <button
                    key={`followup-${i}`}
                    onClick={() => onDemoPromptClick(prompt)}
                    className="text-left px-3 py-1.5 rounded-lg text-xs transition-all flex items-center gap-1.5"
                    style={{
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      color: "var(--text-secondary)",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor = "var(--border-hover)";
                      (e.currentTarget as HTMLElement).style.color = "var(--accent-soft)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
                      (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)";
                    }}
                  >
                    <span>{prompt}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      )}
    </div>
  );
}
