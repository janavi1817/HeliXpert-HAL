"use client";

import React, { useState, useEffect } from "react";
import { fetchConversations, fetchConversationDetails, deleteConversation } from "@/lib/api";
import { Message, ChatMode } from "@/lib/types";
import {
  X,
  Clock,
  Calendar,
  ChevronRight,
  Loader2,
  Trash2,
  MessageSquarePlus,
  Database,
  Layers,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export interface SessionData {
  id: string;
  session_id: string;
  title: string;
  dataset_id?: string;
  mode?: ChatMode;
  datasets_used?: string[];
  created_at: string;
  updated_at: string;
  messages: Message[];
}

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSession: (session: SessionData) => void;
  onNewChat: () => void;
  currentConvId?: string;
}

export default function HistoryDrawer({
  isOpen,
  onClose,
  onSelectSession,
  onNewChat,
  currentConvId,
}: HistoryDrawerProps) {
  const [groupedConversations, setGrouped] = useState<{
    today: any[];
    yesterday: any[];
    earlier: any[];
  }>({ today: [], yesterday: [], earlier: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [loadingSessionId, setLoadingSessionId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadSessions = () => {
    setIsLoading(true);
    fetchConversations()
      .then(setGrouped)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    if (!isOpen) return;
    loadSessions();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelect = async (convId: string) => {
    setLoadingSessionId(convId);
    try {
      const details = await fetchConversationDetails(convId);
      onSelectSession({
        id: details.id || convId,
        session_id: details.session_id || details.id || convId,
        title: details.title,
        dataset_id: details.dataset_id,
        mode: details.mode,
        datasets_used: details.datasets_used || [],
        created_at: details.created_at,
        updated_at: details.updated_at,
        messages: details.messages || [],
      });
      onClose();
    } catch (err) {
      console.error("Failed to load session details:", err);
    } finally {
      setLoadingSessionId(null);
    }
  };

  const handleDeleteSession = async (e: React.MouseEvent, convId: string) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this chat session?")) return;
    setDeletingId(convId);
    try {
      await deleteConversation(convId);
      setGrouped((prev) => ({
        today: prev.today.filter((c) => c.id !== convId),
        yesterday: prev.yesterday.filter((c) => c.id !== convId),
        earlier: prev.earlier.filter((c) => c.id !== convId),
      }));
    } catch (err) {
      console.error("Failed to delete session:", err);
    } finally {
      setDeletingId(null);
    }
  };

  const renderGroup = (label: string, list: any[], Icon: any) => {
    if (!list?.length) return null;
    return (
      <div className="space-y-1.5">
        <div
          className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider"
          style={{ color: "var(--text-muted)" }}
        >
          <Icon className="w-3.5 h-3.5" style={{ color: "var(--accent-soft)" }} />
          <span>{label}</span>
          <span className="text-[10px] opacity-60">({list.length})</span>
        </div>

        <div className="space-y-1">
          {list.map((c) => {
            const isCurrent = currentConvId === c.id;
            const isLoadingThis = loadingSessionId === c.id;
            const datasets: string[] = c.datasets_used || [];

            return (
              <div
                key={c.id}
                onClick={() => handleSelect(c.id)}
                className="group relative w-full px-3 py-2.5 rounded-xl text-left text-xs transition-all border cursor-pointer hover:border-[var(--border-hover)]"
                style={{
                  background: isCurrent ? "var(--accent-light)" : "var(--bg-tertiary)",
                  borderColor: isCurrent ? "var(--border-hover)" : "transparent",
                  color: isCurrent ? "var(--accent-soft)" : "var(--text-primary)",
                  boxShadow: isCurrent ? "var(--shadow-sm)" : "none",
                }}
              >
                {/* Main line: Caret ▸ Title & Delete */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {/* Visual ▸ Indicator */}
                    <span
                      className="font-bold text-sm shrink-0 transition-transform group-hover:translate-x-0.5"
                      style={{ color: isCurrent ? "var(--accent-soft)" : "var(--text-muted)" }}
                    >
                      ▸
                    </span>

                    <span className="truncate font-semibold text-xs" title={c.title}>
                      {c.title || "Helicopter Intelligence Session"}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {isLoadingThis ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: "var(--accent-soft)" }} />
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => handleDeleteSession(e, c.id)}
                        disabled={deletingId === c.id}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded-lg transition-all hover:bg-red-500/20 text-red-400"
                        title="Delete Session"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Sub details: Datasets used during session & message count */}
                <div className="flex items-center gap-1.5 mt-1.5 pl-4 flex-wrap">
                  {datasets.length > 0 ? (
                    datasets.map((dName, di) => (
                      <span
                        key={di}
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono"
                        style={{
                          background: "var(--surface)",
                          color: "var(--text-secondary)",
                          border: "1px solid var(--border)",
                        }}
                      >
                        <Database className="w-2.5 h-2.5 text-emerald-400" />
                        <span className="truncate max-w-[120px]">{dName}</span>
                      </span>
                    ))
                  ) : (
                    <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                      Fleet Query
                    </span>
                  )}

                  {c.message_count > 0 && (
                    <span className="text-[10px] ml-auto font-mono" style={{ color: "var(--text-muted)" }}>
                      {c.message_count} {c.message_count === 1 ? "msg" : "msgs"}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const isEmpty =
    groupedConversations.today.length === 0 &&
    groupedConversations.yesterday.length === 0 &&
    groupedConversations.earlier.length === 0;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 280 }}
        className="relative w-full max-w-sm h-full flex flex-col p-5 overflow-hidden"
        style={{
          background: "var(--bg-secondary)",
          borderLeft: "1px solid var(--border)",
          boxShadow: "var(--shadow-xl)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div
          className="flex items-center justify-between pb-4 mb-4"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: "var(--accent-light)", border: "1px solid var(--border-hover)" }}
            >
              <Clock className="w-4 h-4" style={{ color: "var(--accent-soft)" }} />
            </div>
            <div>
              <h3 className="font-bold text-base uppercase tracking-wider" style={{ color: "var(--text-primary)" }}>
                Chat History
              </h3>
              <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                Session-Based Aerospace Conversations
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors cursor-pointer"
            style={{ color: "var(--text-muted)", background: "var(--bg-tertiary)" }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Start New Chat Action */}
        <div className="mb-4">
          <button
            onClick={() => {
              onNewChat();
              onClose();
            }}
            className="btn-primary w-full py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 text-xs font-semibold shadow-sm"
          >
            <MessageSquarePlus className="w-4 h-4" />
            <span>New Chat Session</span>
          </button>
        </div>

        {/* Sessions List Content */}
        <div className="flex-1 overflow-y-auto space-y-5 pr-1">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--accent-soft)" }} />
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                Loading conversation sessions...
              </span>
            </div>
          ) : isEmpty ? (
            <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{ background: "var(--bg-tertiary)", border: "1px solid var(--border)" }}
              >
                <Layers className="w-6 h-6" style={{ color: "var(--text-muted)", opacity: 0.5 }} />
              </div>
              <p className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>
                No conversation sessions yet.
              </p>
              <p className="text-[11px] max-w-[200px]" style={{ color: "var(--text-muted)" }}>
                Ask a question or upload a dataset to begin your first session.
              </p>
            </div>
          ) : (
            <>
              {renderGroup("Today", groupedConversations.today, Clock)}
              {renderGroup("Yesterday", groupedConversations.yesterday, Calendar)}
              {renderGroup("Earlier", groupedConversations.earlier, Calendar)}
            </>
          )}
        </div>

        {/* Footer */}
        <div
          className="pt-3 text-center text-[10px] flex items-center justify-between"
          style={{ borderTop: "1px solid var(--border)", color: "var(--text-muted)" }}
        >
          <span>One conversation = one session</span>
          <span className="font-mono">HeliXpert DB</span>
        </div>
      </motion.div>
    </div>
  );
}
