"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquarePlus,
  History,
  UploadCloud,
  Image as ImageIcon,
  LayoutDashboard,
  Database,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import clsx from "clsx";

interface SidebarProps {
  activeTab: "chat" | "dashboard" | "history";
  setActiveTab: (tab: "chat" | "dashboard" | "history") => void;
  hasDataset: boolean;
  onNewChat: () => void;
  onOpenDatasetUpload: () => void;
  onOpenImageUpload: () => void;
  onToggleHistory: () => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  activeDatasetName?: string;
}

const NAV_ITEMS = [
  { id: "new-chat",    icon: MessageSquarePlus, label: "New Chat",       action: "newChat"    },
  { id: "history",     icon: History,           label: "Chat History",   action: "history"    },
  { id: "dataset",     icon: UploadCloud,       label: "Upload Dataset", action: "dataset"    },
  { id: "image",       icon: ImageIcon,         label: "Upload Image",   action: "image"      },
];

export default function Sidebar({
  activeTab,
  setActiveTab,
  hasDataset,
  onNewChat,
  onOpenDatasetUpload,
  onOpenImageUpload,
  onToggleHistory,
  isCollapsed,
  setIsCollapsed,
  activeDatasetName,
}: SidebarProps) {

  const handleAction = (action: string) => {
    if (action === "newChat")  onNewChat();
    if (action === "history")  onToggleHistory();
    if (action === "dataset")  onOpenDatasetUpload();
    if (action === "image")    onOpenImageUpload();
  };

  return (
    <motion.aside
      animate={{ width: isCollapsed ? 72 : 256 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="relative z-20 flex flex-col h-full overflow-hidden"
      style={{
        background: "var(--surface)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        borderRight: "1px solid var(--border)",
        boxShadow: "var(--shadow-md)",
      }}
    >
      <div className="flex flex-col h-full p-3 select-none">

        {/* ── Brand ── */}
        <div className="flex items-center justify-between pb-4 mb-3"
             style={{ borderBottom: "1px solid var(--border)" }}>
          <div className="flex items-center gap-3 min-w-0 overflow-hidden">
            {/* Logo mark */}
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center shadow-lg shadow-purple-500/25 shrink-0">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M12 3L4 8V16L12 21L20 16V8L12 3Z" stroke="white" strokeWidth="1.8" strokeLinejoin="round" />
                <path d="M12 8V16M8 10L12 8L16 10" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>

            <AnimatePresence>
              {!isCollapsed && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                >
                  <div className="font-bold text-base leading-none whitespace-nowrap"
                       style={{ color: "var(--text-primary)" }}>
                    Heli<span className="text-gradient">Xpert</span>
                  </div>
                  <div className="text-[10px] mt-0.5 whitespace-nowrap font-medium"
                       style={{ color: "var(--text-muted)" }}>
                    Flight Intelligence
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 rounded-lg transition-colors shrink-0"
            style={{ color: "var(--text-muted)" }}
            title={isCollapsed ? "Expand" : "Collapse"}
          >
            {isCollapsed
              ? <ChevronRight className="w-4 h-4" />
              : <ChevronLeft  className="w-4 h-4" />}
          </button>
        </div>

        {/* ── Navigation ── */}
        <div className="flex-1 space-y-1">
          {/* New Chat — highlighted */}
          <button
            onClick={onNewChat}
            title="New Chat"
            className="sidebar-item w-full"
            style={{
              background: "var(--accent-light)",
              color: "var(--accent)",
              border: "1px solid var(--border-hover)",
              fontWeight: 600,
            }}
          >
            <MessageSquarePlus className="w-[18px] h-[18px] shrink-0" />
            <AnimatePresence>
              {!isCollapsed && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="truncate text-sm"
                >
                  New Chat
                </motion.span>
              )}
            </AnimatePresence>
          </button>

          {/* History */}
          <button onClick={onToggleHistory} title="Chat History" className="sidebar-item w-full">
            <History className="w-[18px] h-[18px] shrink-0" />
            {!isCollapsed && <span className="truncate text-sm">Chat History</span>}
          </button>

          {/* Upload Dataset */}
          <button onClick={onOpenDatasetUpload} title="Upload Dataset" className="sidebar-item w-full">
            <UploadCloud className="w-[18px] h-[18px] shrink-0" />
            {!isCollapsed && <span className="truncate text-sm">Upload Dataset</span>}
          </button>

          {/* Upload Image */}
          <button onClick={onOpenImageUpload} title="Upload Image" className="sidebar-item w-full">
            <ImageIcon className="w-[18px] h-[18px] shrink-0" />
            {!isCollapsed && <span className="truncate text-sm">Upload Image</span>}
          </button>

          {/* Dataset Dashboard — appears when dataset loaded */}
          <AnimatePresence>
            {hasDataset && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.35, ease: "easeInOut" }}
              >
                <button
                  onClick={() =>
                    setActiveTab(activeTab === "dashboard" ? "chat" : "dashboard")
                  }
                  title="Dataset Dashboard"
                  className={clsx(
                    "sidebar-item w-full",
                    activeTab === "dashboard" && "active"
                  )}
                >
                  <LayoutDashboard className="w-[18px] h-[18px] shrink-0" />
                  {!isCollapsed && (
                    <div className="flex items-center justify-between w-full min-w-0">
                      <span className="truncate text-sm">Dataset Dashboard</span>
                      <span className="flex h-2 w-2 shrink-0">
                        <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full opacity-75"
                              style={{ background: "var(--accent-soft)" }} />
                        <span className="relative inline-flex rounded-full h-2 w-2"
                              style={{ background: "var(--accent-soft)" }} />
                      </span>
                    </div>
                  )}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Footer: Active dataset + user ── */}
        <div className="pt-3 space-y-3" style={{ borderTop: "1px solid var(--border)" }}>
          {/* Active dataset badge */}
          {hasDataset && !isCollapsed && (
            <div className="glass-card p-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Database className="w-3 h-3" style={{ color: "var(--accent-soft)" }} />
                <span className="text-[10px] font-semibold uppercase tracking-wider"
                      style={{ color: "var(--accent-soft)" }}>
                  Active Dataset
                </span>
              </div>
              <p className="text-xs font-medium truncate" style={{ color: "var(--text-primary)" }}
                 title={activeDatasetName}>
                {activeDatasetName || "HAL Fleet Intelligence"}
              </p>
            </div>
          )}

          {/* User profile */}
          <div className="flex items-center gap-3 px-1">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                 style={{
                   background: "var(--accent-light)",
                   border: "1px solid var(--border-hover)",
                   color: "var(--accent-soft)",
                 }}>
              JN
            </div>
            {!isCollapsed && (
              <div className="overflow-hidden leading-tight">
                <div className="text-xs font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                  Janavi N S
                </div>
                <div className="text-[10px] flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                  Free Plan
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.aside>
  );
}
