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
import HistoryDrawer from "@/components/sidebar/HistoryDrawer";
import { fetchDatasets, sendChatMessage } from "@/lib/api";
import { Dataset, Message, ChatMode, Language } from "@/lib/types";

export default function Home() {
  const [screen, setScreen]           = useState<"landing" | "dashboard">("landing");
  const [activeTab, setActiveTab]     = useState<"chat" | "dashboard" | "history">("chat");
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);

  const [currentDataset, setCurrentDataset] = useState<Dataset | null>(null);
  const [messages, setMessages]             = useState<Message[]>([]);
  const [currentConvId, setCurrentConvId]   = useState<string | undefined>(undefined);
  const [chatMode, setChatMode]             = useState<ChatMode>("nlp");
  const [language, setLanguage]             = useState<Language>("en");
  const [isSending, setIsSending]           = useState(false);

  const [isDatasetModalOpen, setIsDatasetModalOpen] = useState(false);
  const [isImageModalOpen,   setIsImageModalOpen]   = useState(false);
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const datasets = await fetchDatasets();
        if (datasets?.length > 0) setCurrentDataset(datasets[0]);
      } catch {}
    })();
  }, []);

  const handleStartLanding = () => setScreen("dashboard");

  const handleDatasetLoaded = (dataset: Dataset) => setCurrentDataset(dataset);

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
          rag_metadata: res.rag_metadata,
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

  const handleSelectHistoryConversation = (
    convId: string,
    loadedMessages: Message[],
    _title: string
  ) => {
    setCurrentConvId(convId);
    setMessages(loadedMessages);
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
                    language={language}
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
              ) : currentDataset ? (
                <DatasetDashboard
                  datasetId={currentDataset.id}
                  datasetName={currentDataset.name}
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
        onSelectConversation={handleSelectHistoryConversation}
        currentConvId={currentConvId}
      />
    </div>
  );
}
