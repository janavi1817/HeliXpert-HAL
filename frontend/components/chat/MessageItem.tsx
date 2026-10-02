"use client";

import React, { useState } from "react";
import { Message } from "@/lib/types";
import { Copy, Check, Volume2, VolumeX, Terminal, Layers, ChevronDown, ChevronUp, Loader2, Database } from "lucide-react";
import clsx from "clsx";
import { motion } from "framer-motion";
import RAGTransparencyPanel from "./RAGTransparencyPanel";
import HelicopterLogo from "@/components/ui/HelicopterLogo";

interface MessageItemProps {
  message: Message;
}

export default function MessageItem({ message }: MessageItemProps) {
  const isAssistant = message.role === "assistant";
  const [copied, setCopied] = useState(false);
  const [isPlayingAudio, setIsPlaying] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [isRagPanelOpen, setIsRagPanelOpen] = useState(false);

  const handleCopySQL = () => {
    if (message.sql_query) {
      navigator.clipboard.writeText(message.sql_query);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const cleanTextForVoice = (raw: string): string => {
    return raw
      .replace(/```[\s\S]*?```/g, "")
      .replace(/`[^`]*`/g, "")
      .replace(/[*_]{1,3}/g, "")
      .replace(/#+\s*/g, "")
      .replace(/\|[^\n]+\|/g, "")
      .replace(/[•\-\*]\s+/g, "")
      .replace(/\s+/g, " ")
      .trim();
  };

  const handleSpeak = async () => {
    setAudioError(null);

    // If currently playing, stop both HTML Audio and Browser TTS
    if (isPlayingAudio || isLoadingAudio) {
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
      }
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      setIsPlaying(false);
      setIsLoadingAudio(false);
      return;
    }

    const cleaned = cleanTextForVoice(message.content);
    if (!cleaned) return;

    // Automatic Language Detection (Hindi Devanagari, Kannada, English)
    let detectedLang = message.language || "en";
    if (/[\u0900-\u097F]/.test(cleaned)) {
      detectedLang = "hi";
    } else if (/[\u0C80-\u0CFF]/.test(cleaned)) {
      detectedLang = "kn";
    }

    setIsLoadingAudio(true);

    try {
      const { fetchSpeechAudio } = await import("@/lib/api");
      const audioBlob = await fetchSpeechAudio(cleaned, detectedLang);

      if (audioBlob) {
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        setCurrentAudio(audio);

        audio.onplay = () => {
          setIsPlaying(true);
          setIsLoadingAudio(false);
        };
        audio.onended = () => {
          setIsPlaying(false);
          URL.revokeObjectURL(audioUrl);
        };
        audio.onerror = () => {
          setIsPlaying(false);
          setIsLoadingAudio(false);
          fallbackBrowserTTS(cleaned, detectedLang);
        };

        await audio.play();
        return;
      }
    } catch {
      // Backend TTS unavailable, fallback to browser
    }

    // Fallback: Browser Web Speech Synthesis
    fallbackBrowserTTS(cleaned, detectedLang);
  };

  const fallbackBrowserTTS = (text: string, lang: string) => {
    if (!("speechSynthesis" in window)) {
      setIsLoadingAudio(false);
      setIsPlaying(false);
      setAudioError("Text-to-speech not supported on this browser.");
      return;
    }

    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const targetLang = lang === "hi" ? "hi-IN" : lang === "kn" ? "kn-IN" : "en-US";
    u.lang = targetLang;

    // Match browser voice if available
    const voices = window.speechSynthesis.getVoices();
    const matchingVoice = voices.find((v) => v.lang.toLowerCase().startsWith(lang));
    if (matchingVoice) {
      u.voice = matchingVoice;
    }

    u.onstart = () => {
      setIsPlaying(true);
      setIsLoadingAudio(false);
    };
    u.onend = () => {
      setIsPlaying(false);
    };
    u.onerror = (e) => {
      setIsPlaying(false);
      setIsLoadingAudio(false);
      setAudioError("Speech output failed. Please check sound settings.");
    };

    window.speechSynthesis.speak(u);
  };

  // Render markdown tables and basic formatting
  const renderFormattedContent = (content: string) => {
    const lines = content.split("\n");
    const elements: React.ReactNode[] = [];
    let tableBuffer: string[] = [];
    let inTable = false;

    lines.forEach((line, idx) => {
      if (line.trim().startsWith("|") && line.trim().endsWith("|")) {
        inTable = true;
        tableBuffer.push(line);
      } else {
        if (inTable && tableBuffer.length > 0) {
          elements.push(renderTable(tableBuffer, `table-${idx}`));
          tableBuffer = [];
          inTable = false;
        }
        if (line.trim().startsWith("###")) {
          elements.push(
            <h4 key={idx} className="font-bold text-sm mt-3 mb-1"
                style={{ color: "var(--accent-soft)" }}>
              {line.replace("###", "").trim()}
            </h4>
          );
        } else if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
          elements.push(
            <li key={idx} className="ml-4 list-disc my-0.5 text-sm"
                style={{ color: "var(--text-secondary)" }}>
              {renderInlineStyles(line.substring(2))}
            </li>
          );
        } else if (line.trim() !== "") {
          elements.push(
            <p key={idx} className="leading-relaxed my-1 text-sm"
               style={{ color: isAssistant ? "var(--text-primary)" : "#fff" }}>
              {renderInlineStyles(line)}
            </p>
          );
        }
      }
    });

    if (inTable && tableBuffer.length > 0) {
      elements.push(renderTable(tableBuffer, "table-final"));
    }
    return elements;
  };

  const renderInlineStyles = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={i} className="font-semibold"
                  style={{ color: isAssistant ? "var(--accent-soft)" : "rgba(255,255,255,0.9)" }}>
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  };

  const renderTable = (tableLines: string[], key: string) => {
    if (tableLines.length < 2) return null;
    const headerCols = tableLines[0].split("|").slice(1, -1).map((c) => c.trim());
    const dataRows   = tableLines.slice(2).map((l) => l.split("|").slice(1, -1).map((c) => c.trim()));

    return (
      <div key={key} className="my-3 overflow-x-auto rounded-xl"
           style={{ border: "1px solid var(--border)", background: "var(--bg-tertiary)" }}>
        <table className="data-table">
          <thead>
            <tr>
              {headerCols.map((col, ci) => (
                <th key={ci}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dataRows.map((row, ri) => (
              <tr key={ri}>
                {row.map((cell, ci) => (
                  <td key={ci} className="font-mono text-xs">{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={clsx(
        "flex w-full gap-3 my-3",
        isAssistant ? "justify-start" : "justify-end"
      )}
    >
      {/* Bot avatar */}
      {isAssistant && (
        <HelicopterLogo size={32} />
      )}

      {/* Bubble */}
      <div className={clsx("max-w-[78%] rounded-2xl p-4 text-sm leading-relaxed shadow-sm",
                           isAssistant ? "msg-assistant" : "msg-user")}>

        <div className="space-y-1">
          {renderFormattedContent(message.content)}
        </div>

        {/* Data Query block (Dataset Used, SQL Executed, Result Table) */}
        {message.sql_query && (
          <div className="mt-4 pt-3 space-y-2.5" style={{ borderTop: "1px solid var(--border)" }}>
            {/* Dataset Used */}
            {(message.dataset_name || message.dataset_used) && (
              <div className="flex items-center gap-1.5 text-xs">
                <span className="font-semibold" style={{ color: "var(--text-muted)" }}>Dataset Used:</span>
                <span className="font-mono font-semibold px-2 py-0.5 rounded-lg text-[11px]"
                      style={{
                        background: "rgba(16, 185, 129, 0.12)",
                        border: "1px solid rgba(16, 185, 129, 0.3)",
                        color: "#10b981",
                      }}>
                  {message.dataset_name || message.dataset_used}
                </span>
              </div>
            )}

            {/* SQL Executed */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="flex items-center gap-1.5 text-xs font-semibold"
                      style={{ color: "var(--accent-soft)" }}>
                  <Terminal className="w-3.5 h-3.5" />
                  SQL EXECUTED
                </span>
                <button
                  onClick={handleCopySQL}
                  className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg transition-colors"
                  style={{
                    background: "var(--bg-tertiary)",
                    border: "1px solid var(--border)",
                    color: "var(--text-muted)",
                  }}
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <div className="p-3 rounded-xl font-mono text-xs overflow-x-auto"
                   style={{
                     background: "var(--bg-primary)",
                     border: "1px solid var(--border)",
                     color: "var(--accent-soft)",
                   }}>
                <code>{message.sql_query}</code>
              </div>
            </div>

            {/* Verified Query Result Preview */}
            {message.query_result && Array.isArray(message.query_result) && message.query_result.length > 0 && (
              <div className="pt-1 space-y-1">
                <span className="text-xs font-semibold flex items-center gap-1.5" style={{ color: "var(--text-primary)" }}>
                  <Database className="w-3 h-3" style={{ color: "var(--accent-soft)" }} />
                  Verified Result ({message.query_result.length} row{message.query_result.length > 1 ? "s" : ""}):
                </span>
                <div className="overflow-x-auto rounded-xl border max-h-48 overflow-y-auto" style={{ borderColor: "var(--border)" }}>
                  <table className="w-full text-left text-xs font-mono">
                    <thead style={{ background: "var(--bg-tertiary)" }}>
                      <tr>
                        {Object.keys(message.query_result[0]).map((col) => (
                          <th key={col} className="p-2 font-semibold text-[11px]" style={{ color: "var(--text-secondary)" }}>
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {message.query_result.slice(0, 8).map((row, rIdx) => (
                        <tr key={rIdx} className="border-t" style={{ borderColor: "var(--border)" }}>
                          {Object.values(row).map((val: any, cIdx) => (
                            <td key={cIdx} className="p-2 text-[11px]" style={{ color: "var(--text-primary)" }}>
                              {val !== null && val !== undefined ? String(val) : "-"}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Actions for assistant */}
        {isAssistant && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 pt-2"
               style={{ borderTop: "1px solid var(--border)" }}>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSpeak}
                disabled={isLoadingAudio}
                className={clsx(
                  "flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg transition-all",
                  isPlayingAudio && "animate-pulse"
                )}
                style={{
                  background: isPlayingAudio ? "var(--accent-light)" : "var(--bg-tertiary)",
                  border: "1px solid var(--border)",
                  color: isPlayingAudio ? "var(--accent-soft)" : "var(--text-muted)",
                }}
                title={isPlayingAudio ? "Stop Audio" : isLoadingAudio ? "Synthesizing voice..." : "Listen"}
              >
                {isLoadingAudio ? (
                  <Loader2 className="w-3 h-3 animate-spin text-[var(--accent-soft)]" />
                ) : isPlayingAudio ? (
                  <VolumeX className="w-3 h-3 text-[var(--accent-soft)]" />
                ) : (
                  <Volume2 className="w-3 h-3" />
                )}
                <span>{isLoadingAudio ? "Loading..." : isPlayingAudio ? "Stop" : "Speak"}</span>
              </button>

              {audioError && (
                <span className="text-[11px] text-amber-500 font-medium">
                  {audioError}
                </span>
              )}

              {/* RAG Transparency Icon Button (Only shown if RAG was actually used) */}
              {message.rag_metadata && message.rag_metadata.used_rag && (
                <button
                  onClick={() => setIsRagPanelOpen(!isRagPanelOpen)}
                  className={clsx(
                    "flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg transition-all border",
                    isRagPanelOpen ? "font-semibold shadow-sm" : "hover:border-[var(--border-hover)]"
                  )}
                  style={{
                    background: isRagPanelOpen ? "var(--accent-light)" : "var(--bg-tertiary)",
                    borderColor: isRagPanelOpen ? "var(--accent-soft)" : "var(--border)",
                    color: isRagPanelOpen ? "var(--accent-soft)" : "var(--text-secondary)",
                  }}
                  title="Inspect RAG Retrieval & Transparency Details"
                >
                  <Layers className="w-3.5 h-3.5 text-[var(--accent-soft)]" />
                  <span>RAG Transparency</span>
                  <span
                    className="text-[10px] px-1.5 py-0.2 rounded font-mono font-bold"
                    style={{ background: "var(--surface)", color: "var(--accent-soft)" }}
                  >
                    {message.rag_metadata.retrieved_chunks?.length ?? 0}
                  </span>
                  {isRagPanelOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              )}
            </div>

            <span className="text-[10px] font-mono" style={{ color: "var(--text-muted)" }}>
              {message.created_at
                ? new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                : "Just now"}
            </span>
          </div>
        )}

        {/* Expandable RAG Transparency Panel */}
        {isAssistant && message.rag_metadata && message.rag_metadata.used_rag && (
          <RAGTransparencyPanel metadata={message.rag_metadata} isOpen={isRagPanelOpen} />
        )}
      </div>

      {/* User avatar */}
      {!isAssistant && (
        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold"
             style={{
               background: "var(--accent-light)",
               border: "1px solid var(--border-hover)",
               color: "var(--accent-soft)",
             }}>
          JN
        </div>
      )}
    </motion.div>
  );
}
