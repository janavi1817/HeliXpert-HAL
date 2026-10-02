"use client";

import React, { useState, useEffect } from "react";
import { fetchConversations, fetchConversationDetails } from "@/lib/api";
import { Message } from "@/lib/types";
import { X, MessageSquare, Clock, Calendar, ChevronRight, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectConversation: (convId: string, messages: Message[], title: string) => void;
  currentConvId?: string;
}

export default function HistoryDrawer({
  isOpen, onClose, onSelectConversation, currentConvId,
}: HistoryDrawerProps) {
  const [groupedConversations, setGrouped] = useState<{
    today: any[]; yesterday: any[]; earlier: any[];
  }>({ today: [], yesterday: [], earlier: [] });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setIsLoading(true);
    fetchConversations()
      .then(setGrouped)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelect = async (convId: string, title: string) => {
    try {
      const details = await fetchConversationDetails(convId);
      onSelectConversation(convId, details.messages, title);
      onClose();
    } catch {}
  };

  const renderGroup = (label: string, list: any[], Icon: any) => {
    if (!list?.length) return null;
    return (
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 px-2 text-[10px] font-semibold uppercase tracking-widest"
             style={{ color: "var(--text-muted)" }}>
          <Icon className="w-3 h-3" style={{ color: "var(--accent-soft)" }} />
          {label}
        </div>
        {list.map((c) => (
          <button
            key={c.id}
            onClick={() => handleSelect(c.id, c.title)}
            className="w-full px-3 py-2.5 rounded-xl text-left text-xs flex items-center justify-between gap-2 transition-all group"
            style={{
              background: currentConvId === c.id ? "var(--accent-light)" : "transparent",
              border: `1px solid ${currentConvId === c.id ? "var(--border-hover)" : "transparent"}`,
              color: currentConvId === c.id ? "var(--accent-soft)" : "var(--text-secondary)",
            }}
          >
            <div className="flex items-center gap-2 truncate min-w-0">
              <MessageSquare className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--text-muted)" }} />
              <span className="truncate font-medium">{c.title}</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 shrink-0 transition-transform group-hover:translate-x-0.5"
                          style={{ color: "var(--text-muted)" }} />
          </button>
        ))}
      </div>
    );
  };

  const isEmpty =
    groupedConversations.today.length === 0 &&
    groupedConversations.yesterday.length === 0 &&
    groupedConversations.earlier.length === 0;

  return (
    <div className="fixed inset-0 z-50 flex justify-end"
         style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}
         onClick={onClose}>
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 280 }}
        className="relative w-full max-w-sm h-full flex flex-col p-5"
        style={{
          background: "var(--bg-secondary)",
          borderLeft: "1px solid var(--border)",
          boxShadow: "var(--shadow-xl)",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 mb-4"
             style={{ borderBottom: "1px solid var(--border)" }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                 style={{ background: "var(--accent-light)", border: "1px solid var(--border-hover)" }}>
              <Clock className="w-4 h-4" style={{ color: "var(--accent-soft)" }} />
            </div>
            <h3 className="font-bold text-base" style={{ color: "var(--text-primary)" }}>
              Chat History
            </h3>
          </div>
          <button onClick={onClose}
                  className="p-1.5 rounded-lg transition-colors"
                  style={{ color: "var(--text-muted)", background: "var(--bg-tertiary)" }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto space-y-5">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--accent-soft)" }} />
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>Loading history...</span>
            </div>
          ) : isEmpty ? (
            <div className="flex flex-col items-center justify-center py-16 text-center gap-2">
              <MessageSquare className="w-8 h-8" style={{ color: "var(--text-muted)", opacity: 0.4 }} />
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>No conversations yet.</p>
            </div>
          ) : (
            <>
              {renderGroup("Today",     groupedConversations.today,     Clock)}
              {renderGroup("Yesterday", groupedConversations.yesterday, Calendar)}
              {renderGroup("Earlier",   groupedConversations.earlier,   Calendar)}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 text-center text-[10px]" style={{ borderTop: "1px solid var(--border)", color: "var(--text-muted)" }}>
          Persisted in HeliXpert Database
        </div>
      </motion.div>
    </div>
  );
}
