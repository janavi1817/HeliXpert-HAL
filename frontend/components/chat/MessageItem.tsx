"use client";

import React, { useState } from "react";
import { Message } from "@/lib/types";
import { Copy, Check, Volume2, VolumeX, Terminal } from "lucide-react";
import clsx from "clsx";
import { motion } from "framer-motion";

interface MessageItemProps {
  message: Message;
}

export default function MessageItem({ message }: MessageItemProps) {
  const isAssistant    = message.role === "assistant";
  const [copied, setCopied]           = useState(false);
  const [isPlayingAudio, setIsPlaying] = useState(false);

  const handleCopySQL = () => {
    if (message.sql_query) {
      navigator.clipboard.writeText(message.sql_query);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSpeak = () => {
    if (!("speechSynthesis" in window)) return;
    if (isPlayingAudio) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      return;
    }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(message.content);
    u.lang = message.language === "hi" ? "hi-IN" : message.language === "kn" ? "kn-IN" : "en-US";
    u.onend   = () => setIsPlaying(false);
    u.onerror = () => setIsPlaying(false);
    setIsPlaying(true);
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
        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
             style={{
               background: "var(--accent-light)",
               border: "1px solid var(--border-hover)",
             }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M12 3L4 8V16L12 21L20 16V8L12 3Z"
                  stroke="var(--accent-soft)" strokeWidth="1.8" strokeLinejoin="round" />
          </svg>
        </div>
      )}

      {/* Bubble */}
      <div className={clsx("max-w-[78%] rounded-2xl p-4 text-sm leading-relaxed shadow-sm",
                           isAssistant ? "msg-assistant" : "msg-user")}>

        <div className="space-y-1">
          {renderFormattedContent(message.content)}
        </div>

        {/* SQL block */}
        {message.sql_query && (
          <div className="mt-4 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
            <div className="flex items-center justify-between mb-2">
              <span className="flex items-center gap-1.5 text-xs font-semibold"
                    style={{ color: "var(--accent-soft)" }}>
                <Terminal className="w-3 h-3" />
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
        )}

        {/* Actions for assistant */}
        {isAssistant && (
          <div className="mt-3 flex items-center justify-between pt-2"
               style={{ borderTop: "1px solid var(--border)" }}>
            <button
              onClick={handleSpeak}
              className={clsx(
                "flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg transition-all",
                isPlayingAudio && "animate-pulse"
              )}
              style={{
                background: isPlayingAudio ? "var(--accent-light)" : "var(--bg-tertiary)",
                border: "1px solid var(--border)",
                color: isPlayingAudio ? "var(--accent-soft)" : "var(--text-muted)",
              }}
              title={isPlayingAudio ? "Stop Audio" : "Listen"}
            >
              {isPlayingAudio
                ? <VolumeX className="w-3 h-3" />
                : <Volume2 className="w-3 h-3" />}
              <span>{isPlayingAudio ? "Playing" : "Speak"}</span>
            </button>

            <span className="text-[10px] font-mono" style={{ color: "var(--text-muted)" }}>
              {message.created_at
                ? new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                : "Just now"}
            </span>
          </div>
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
