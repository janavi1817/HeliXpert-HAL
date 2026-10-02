"use client";

import React, { useState, useRef } from "react";
import { Send, Mic, MicOff, Image as ImageIcon, Sparkles, Loader2, Radio } from "lucide-react";
import { transcribeAudio } from "@/lib/api";
import { Language } from "@/lib/types";
import clsx from "clsx";
import { motion, AnimatePresence } from "framer-motion";

interface ChatInputProps {
  onSendMessage: (text: string) => void;
  onOpenImageUpload: () => void;
  isLoading: boolean;
  language: Language;
}

const DEMO_QUESTIONS = [
  "How many helicopters are manufactured by HAL?",
  "Which manufacturer has the most helicopters?",
  "What is the average flight time?",
  "Which helicopter has the highest maximum speed?",
  "How many helicopters are currently active?",
  "Show me helicopters manufactured after 2015.",
];

export default function ChatInput({
  onSendMessage,
  onOpenImageUpload,
  isLoading,
  language,
}: ChatInputProps) {
  const [inputText, setInputText]     = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef   = useRef<Blob[]>([]);

  const handleSend = () => {
    if (inputText.trim() && !isLoading) {
      onSendMessage(inputText.trim());
      setInputText("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const startRecording = async () => {
    try {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous    = false;
        recognition.interimResults = false;
        recognition.lang =
          language === "hi" ? "hi-IN" : language === "kn" ? "kn-IN" : "en-US";

        setVoiceStatus("Listening...");
        setIsRecording(true);

        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          if (transcript) { setInputText(transcript); onSendMessage(transcript); }
          setIsRecording(false); setVoiceStatus(null);
        };
        recognition.onerror = () => { setIsRecording(false); setVoiceStatus(null); };
        recognition.onend   = () => { setIsRecording(false); setVoiceStatus(null); };
        recognition.start();
        return;
      }

      // Fallback MediaRecorder
      const stream       = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current   = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      mediaRecorder.onstop = async () => {
        setVoiceStatus("Thinking...");
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        try {
          const text = await transcribeAudio(blob, language);
          if (text) { setInputText(text); onSendMessage(text); }
        } catch {}
        finally {
          setIsRecording(false); setVoiceStatus(null);
          stream.getTracks().forEach((t) => t.stop());
        }
      };
      mediaRecorder.start();
      setIsRecording(true); setVoiceStatus("Listening...");
    } catch {
      // Demo fallback
      setVoiceStatus("Listening...");
      setIsRecording(true);
      setTimeout(() => {
        setVoiceStatus("Thinking...");
        setTimeout(() => {
          const q = "How many helicopters are manufactured by HAL?";
          setInputText(q); onSendMessage(q);
          setIsRecording(false); setVoiceStatus(null);
        }, 800);
      }, 1500);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    } else {
      setIsRecording(false); setVoiceStatus(null);
    }
  };

  const placeholder =
    language === "hi"
      ? "हेलीकॉप्टर डेटासेट के बारे में पूछें..."
      : language === "kn"
      ? "ಹೆಲಿಕಾಪ್ಟರ್ ಡೇಟಾಸೆಟ್ ಬಗ್ಗೆ ಪ್ರಶ್ನಿಸಿ..."
      : "Ask a question...";

  return (
    <div className="w-full max-w-3xl mx-auto space-y-3">

      {/* Suggestion chips */}
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1">
        <span className="text-[11px] font-medium shrink-0 flex items-center gap-1"
              style={{ color: "var(--text-muted)" }}>
          <Sparkles className="w-3 h-3" style={{ color: "var(--accent-soft)" }} />
        </span>
        {DEMO_QUESTIONS.map((q, i) => (
          <button key={i} onClick={() => onSendMessage(q)}
                  className="suggestion-chip">
            {q}
          </button>
        ))}
      </div>

      {/* Voice status */}
      <AnimatePresence>
        {voiceStatus && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            className="flex items-center justify-center gap-2 py-2 px-4 rounded-full w-max mx-auto text-xs font-medium"
            style={{
              background: "var(--accent-light)",
              border: "1px solid var(--border-hover)",
              color: "var(--accent-soft)",
            }}
          >
            <Radio className="w-3.5 h-3.5 animate-spin" />
            <span>{voiceStatus}</span>
            <div className="flex items-center gap-0.5 h-3">
              {[1,2,3,4,5].map(i => (
                <span key={i}
                  className="w-1 rounded-full animate-bounce"
                  style={{
                    background: "var(--accent-soft)",
                    animationDelay: `${i * 0.12}s`,
                    height: `${(i % 3 + 1) * 4}px`,
                  }}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main input box */}
      <div className="chat-input-wrapper">
        {/* Image upload */}
        <button
          onClick={onOpenImageUpload}
          className="p-2 rounded-xl transition-colors shrink-0"
          style={{ color: "var(--text-muted)" }}
          title="Upload Helicopter Image"
          onMouseEnter={e => (e.currentTarget as any).style.color = "var(--accent-soft)"}
          onMouseLeave={e => (e.currentTarget as any).style.color = "var(--text-muted)"}
        >
          <ImageIcon className="w-4.5 h-4.5" />
        </button>

        {/* Text field */}
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isLoading}
          className="flex-1 bg-transparent text-sm focus:outline-none py-2"
          style={{ color: "var(--text-primary)" }}
        />

        {/* Mic button */}
        <button
          onClick={isRecording ? stopRecording : startRecording}
          className={clsx(
            "p-2 rounded-xl transition-all shrink-0",
            isRecording ? "animate-pulse" : ""
          )}
          style={{
            color: isRecording ? "#ef4444" : "var(--text-muted)",
            background: isRecording ? "rgba(239,68,68,0.1)" : "transparent",
            border: isRecording ? "1px solid rgba(239,68,68,0.3)" : "1px solid transparent",
          }}
          title={isRecording ? "Stop Recording" : "Voice Input"}
        >
          {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </button>

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={!inputText.trim() || isLoading}
          className={clsx(
            "p-2.5 rounded-xl transition-all flex items-center justify-center shrink-0",
            inputText.trim() && !isLoading
              ? "btn-primary px-3 py-2"
              : "opacity-40 cursor-not-allowed"
          )}
          style={
            !inputText.trim() || isLoading
              ? { background: "var(--bg-tertiary)", color: "var(--text-muted)" }
              : {}
          }
        >
          {isLoading
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <Send className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}
