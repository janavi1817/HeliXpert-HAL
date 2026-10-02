"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import LandingOverlay from "@/components/landing/LandingOverlay";
import Sidebar from "@/components/sidebar/Sidebar";
import Header from "@/components/ui/Header";
import ChatWindow from "@/components/chat/ChatWindow";
import ChatInput from "@/components/chat/ChatInput";
import DatasetDashboard from "@/components/dashboard/DatasetDashboard";
import DatasetUploadModal from "@/components/upload/DatasetUploadModal";
import ImageUploadModal from "@/components/upload/ImageUploadModal";
import HistoryDrawer, { SessionData } from "@/components/sidebar/HistoryDrawer";
import { fetchDatasets, sendChatMessage, fetchSuggestedPrompts } from "@/lib/api";
import { Dataset, Message, ChatMode, Language } from "@/lib/types";

export default function Home() {
  const [screen, setScreen]           = useState<"landing" | "dashboard">("landing");
  const [activeTab, setActiveTab]     = useState<"chat" | "dashboard" | "history">("chat");
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);

  const [allDatasets, setAllDatasets]       = useState<Dataset[]>([]);
  const [selectedDatasetIds, setSelectedDatasetIds] = useState<string[]>([]);
  const [currentDataset, setCurrentDataset] = useState<Dataset | null>(null);
  const [suggestedPrompts, setSuggestedPrompts] = useState<string[]>([]);
  const [isLoadingPrompts, setIsLoadingPrompts] = useState<boolean>(false);

  const [messages, setMessages]             = useState<Message[]>([]);
  const [currentConvId, setCurrentConvId]   = useState<string | undefined>(undefined);
  const [chatMode, setChatMode]             = useState<ChatMode>("nlp");
  const [language, setLanguage]             = useState<Language>("en");
  const [isSending, setIsSending]           = useState(false);

  const [isDatasetModalOpen, setIsDatasetModalOpen] = useState(false);
  const [isImageModalOpen,   setIsImageModalOpen]   = useState(false);
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);

  // Load existing datasets on mount
  useEffect(() => {
    (async () => {
      try {
        const datasets = await fetchDatasets();
        if (datasets?.length > 0) {
          setAllDatasets(datasets);
          setCurrentDataset(datasets[0]);
          setSelectedDatasetIds([datasets[0].id]);
        }
      } catch {}
    })();
  }, []);

  // Dynamically fetch schema-tailored suggested prompts when dataset or language changes
  useEffect(() => {
    let isSubscribed = true;
    setIsLoadingPrompts(true);
    fetchSuggestedPrompts(currentDataset?.id, language)
      .then((prompts) => {
        if (isSubscribed) {
          setSuggestedPrompts(prompts);
          setIsLoadingPrompts(false);
        }
      })
      .catch(() => {
        if (isSubscribed) setIsLoadingPrompts(false);
      });

    return () => {
      isSubscribed = false;
    };
  }, [currentDataset?.id, language]);

  const handleStartLanding = () => setScreen("dashboard");

  const handleDatasetLoaded = (dataset: Dataset) => {
    fetchDatasets()
      .then((updatedList) => {
        setAllDatasets(updatedList);
        const target = updatedList.find((d) => d.id === dataset.id) || updatedList[0] || dataset;
        setCurrentDataset(target);
        setSelectedDatasetIds(updatedList.map((d) => d.id));
      })
      .catch(() => {
        setAllDatasets((prev) => {
          const exists = prev.some((d) => d.id === dataset.id);
          return exists ? prev : [dataset, ...prev];
        });
        setSelectedDatasetIds((prev) => Array.from(new Set([...prev, dataset.id])));
        setCurrentDataset(dataset);
      });
  };

  const handleDatasetDeleted = async (deletedId: string) => {
    try {
      const updatedList = await fetchDatasets();
      setAllDatasets(updatedList);
      setSelectedDatasetIds((prev) => prev.filter((id) => id !== deletedId));
      if (currentDataset?.id === deletedId) {
        setCurrentDataset(updatedList[0] || null);
      }
    } catch {
      setAllDatasets((prev) => prev.filter((d) => d.id !== deletedId));
      setSelectedDatasetIds((prev) => prev.filter((id) => id !== deletedId));
      if (currentDataset?.id === deletedId) {
        setCurrentDataset((prev) => {
          const remaining = allDatasets.filter((d) => d.id !== deletedId);
          return remaining[0] || null;
        });
      }
    }
  };

  const handleToggleDataset = (id: string) => {

    setSelectedDatasetIds((prev) => {
      const exists = prev.includes(id);
      let updated: string[];
      if (exists) {
        if (prev.length === 1) return prev; // Keep at least one selected
        updated = prev.filter((dId) => dId !== id);
      } else {
        updated = [...prev, id];
      }
      const primary = allDatasets.find((d) => d.id === updated[0]) || null;
      setCurrentDataset(primary);
      return updated;
    });
  };

  const handleSelectAllDatasets = () => {
    const allIds = allDatasets.map((d) => d.id);
    setSelectedDatasetIds(allIds);
  };

  const activeDatasetNames = allDatasets
    .filter((d) => selectedDatasetIds.includes(d.id))
    .map((d) => d.name);

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isSending) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text,
      mode: chatMode,
      language,
      created_at: new Date().toISOString(),
    };
    setMessages((p) => [...p, userMsg]);
    setIsSending(true);

    try {
      const res = await sendChatMessage({
        question: text,
        dataset_id: currentDataset?.id,
        dataset_ids: selectedDatasetIds.length > 0 ? selectedDatasetIds : undefined,
        conversation_id: currentConvId,
        mode: chatMode,
        language,
      });
      setCurrentConvId(res.conversation_id);
      setMessages((p) => [
        ...p,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: res.answer,
          sql_query: res.sql,
          query_result: res.result,
          dataset_name: res.dataset_name || res.dataset_used,
          dataset_used: res.dataset_used || res.dataset_name,
          rag_metadata: res.rag_metadata,
          chosen_datasets: res.chosen_datasets,
          mode: res.mode,
          language: res.language as Language,
          created_at: new Date().toISOString(),
        },
      ]);
    } catch (err: any) {
      setMessages((p) => [
        ...p,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: `Error: ${err.message || "Failed to reach HeliXpert service."}`,
          mode: chatMode,
          language,
          created_at: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    setCurrentConvId(undefined);
    setActiveTab("chat");
  };

  const handleSelectSession = (session: SessionData) => {
    // 1. Restore conversation context / session id
    setCurrentConvId(session.id || session.session_id);

    // 2. Restore all messages
    setMessages(session.messages || []);

    // 3. Restore mode (Natural Language vs Data Query)
    if (session.mode) {
      setChatMode(session.mode);
    }

    // 4. Restore selected/active datasets & relevant dataset context
    if (session.datasets_used && session.datasets_used.length > 0 && allDatasets.length > 0) {
      const matched = allDatasets.filter((d) =>
        session.datasets_used?.some(
          (uName) =>
            uName.toLowerCase() === d.name.toLowerCase() ||
            uName.toLowerCase() === d.original_filename.toLowerCase()
        )
      );
      if (matched.length > 0) {
        setSelectedDatasetIds(matched.map((m) => m.id));
        setCurrentDataset(matched[0]);
      } else if (session.dataset_id) {
        const found = allDatasets.find((d) => d.id === session.dataset_id);
        if (found) {
          setSelectedDatasetIds([found.id]);
          setCurrentDataset(found);
        }
      }
    } else if (session.dataset_id && allDatasets.length > 0) {
      const found = allDatasets.find((d) => d.id === session.dataset_id);
      if (found) {
        setSelectedDatasetIds([found.id]);
        setCurrentDataset(found);
      }
    }

    // 5. Restore active tab to chat
    setActiveTab("chat");
  };

  return (
    <div className="relative min-h-screen w-full flex overflow-hidden"
         style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}>

      {/* ── Landing Screen ── */}
      <AnimatePresence>
        {screen === "landing" && (
          <motion.div
            key="landing"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.04 }}
            transition={{ duration: 0.7, ease: "easeInOut" }}
            className="fixed inset-0 z-50 overflow-y-auto overflow-x-hidden"
          >
            <LandingOverlay onStart={handleStartLanding} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main App ── */}
      {screen === "dashboard" && (
        <motion.div
          key="dashboard"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7 }}
          className="flex w-full h-screen overflow-hidden"
        >
          {/* Sidebar */}
          <Sidebar
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            hasDataset={!!currentDataset}
            onNewChat={handleNewChat}
            onOpenDatasetUpload={() => setIsDatasetModalOpen(true)}
            onOpenImageUpload={() => setIsImageModalOpen(true)}
            onToggleHistory={() => setIsHistoryDrawerOpen(true)}
            isCollapsed={isSidebarCollapsed}
            setIsCollapsed={setSidebarCollapsed}
            activeDatasetName={currentDataset?.name}
          />

          {/* Main content */}
          <div className="flex-1 flex flex-col h-full overflow-hidden"
               style={{ background: "var(--bg-primary)" }}>
            <Header
              currentDatasetName={currentDataset?.name}
              rowCount={currentDataset?.row_count}
              mode={chatMode}
              setMode={setChatMode}
              language={language}
              setLanguage={setLanguage}
              onOpenDatasetModal={() => setIsDatasetModalOpen(true)}
              allDatasets={allDatasets}
              selectedDatasetIds={selectedDatasetIds}
              onToggleDataset={handleToggleDataset}
              onSelectAllDatasets={handleSelectAllDatasets}
            />

            <div className="flex-1 flex flex-col overflow-hidden">
              {activeTab === "chat" ? (
                <>
                  <ChatWindow
                    messages={messages}
                    isLoading={isSending}
                    onOpenDatasetUpload={() => setIsDatasetModalOpen(true)}
                    onOpenImageUpload={() => setIsImageModalOpen(true)}
                    onDemoPromptClick={handleSendMessage}
                    hasDataset={!!currentDataset}
                    activeDatasetName={currentDataset?.name}
                    activeDatasetNames={activeDatasetNames}
                    language={language}
                    suggestedPrompts={suggestedPrompts}
                    isLoadingPrompts={isLoadingPrompts}
                  />

                  {/* Chat input area */}
                  <div className="px-4 md:px-6 pb-5 pt-3"
                       style={{
                         background: `linear-gradient(to top, var(--bg-primary) 70%, transparent)`,
                       }}>
                    <ChatInput
                      onSendMessage={handleSendMessage}
                      onOpenImageUpload={() => setIsImageModalOpen(true)}
                      isLoading={isSending}
                      language={language}
                    />
                  </div>
                </>
              ) : currentDataset || allDatasets.length > 0 ? (
                <DatasetDashboard
                  datasetId={currentDataset?.id}
                  datasetName={currentDataset?.name}
                  datasets={allDatasets}
                  onSelectDataset={(d) => setCurrentDataset(d)}
                  onDeleteDataset={handleDatasetDeleted}
                />
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-5">
                  <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                    Please upload a dataset to view the dashboard.
                  </p>
                  <button
                    onClick={() => setIsDatasetModalOpen(true)}
                    className="btn-primary text-sm"
                  >
                    Upload Dataset
                  </button>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Modals ── */}
      <DatasetUploadModal
        isOpen={isDatasetModalOpen}
        onClose={() => setIsDatasetModalOpen(false)}
        onDatasetLoaded={handleDatasetLoaded}
      />
      <ImageUploadModal
        isOpen={isImageModalOpen}
        onClose={() => setIsImageModalOpen(false)}
        datasetId={currentDataset?.id}
        datasetName={currentDataset?.name}
      />
      <HistoryDrawer
        isOpen={isHistoryDrawerOpen}
        onClose={() => setIsHistoryDrawerOpen(false)}
        onSelectSession={handleSelectSession}
        onNewChat={handleNewChat}
        currentConvId={currentConvId}
      />
    </div>
  );
}
