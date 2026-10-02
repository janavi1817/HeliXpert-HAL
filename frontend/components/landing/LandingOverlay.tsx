"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Database,
  Image as ImageIcon,
  MessageSquare,
  Mic,
  Globe,
  ArrowRight,
  Sun,
  Moon,
  Sparkles,
  BarChart3,
  Cpu,
  ShieldCheck,
  Zap,
  CheckCircle2,
  Layers,
  ChevronDown,
} from "lucide-react";
import { useTheme } from "@/lib/theme";
import HelicopterLogo from "@/components/ui/HelicopterLogo";

interface LandingOverlayProps {
  onStart: () => void;
}

const TOP_FEATURES = [
  {
    icon: Database,
    title: "Analyze Datasets",
    desc: "Get insights from your helicopter data",
  },
  {
    icon: ImageIcon,
    title: "Image Analysis",
    desc: "Identify parts, models and more",
  },
  {
    icon: MessageSquare,
    title: "Ask Questions",
    desc: "Natural language or SQL-powered answers",
  },
  {
    icon: Mic,
    title: "Voice Assistant",
    desc: "Talk to your data in your language",
  },
  {
    icon: Globe,
    title: "Multilingual",
    desc: "English • Hindi • Kannada",
  },
];

const DETAILED_FEATURES = [
  {
    icon: Database,
    title: "Fleet Dataset Ingestion & DuckDB",
    desc: "Upload CSV, Excel, Parquet, or JSON datasets up to 50MB. DuckDB processes millions of rows in milliseconds with automated schema inference and statistical profiling.",
    tags: ["DuckDB In-Memory", "Automated Schema", "Zero Setup"],
  },
  {
    icon: ImageIcon,
    title: "Vision AI & Fleet Correlation",
    desc: "Upload helicopter imagery for instant airframe identification, rotor blade analysis, avionics assessment, and automated correlation against active fleet records.",
    tags: ["Gemini 2.5 Flash", "Airframe ID", "Fleet Cross-Check"],
  },
  {
    icon: Mic,
    title: "Multilingual Voice Assistant",
    desc: "Interact through natural speech in English, Hindi, or Kannada. HeliXpert listens, executes SQL or semantic queries, and responds with audio playback.",
    tags: ["English", "Hindi (हिन्दी)", "Kannada (ಕನ್ನಡ)"],
  },
  {
    icon: BarChart3,
    title: "Interactive Aerospace Analytics",
    desc: "Explore speed vs. range scatter plots, flight hour distributions, category donuts, and chronological trendlines generated dynamically for any dataset.",
    tags: ["Dynamic Recharts", "Outlier Detection", "KPI Metrics"],
  },
  {
    icon: Cpu,
    title: "Natural Language to SQL Agent",
    desc: "Ask questions in plain English or regional languages. Our SQL Agent synthesizes read-only SQL, queries DuckDB, and provides verified data tables.",
    tags: ["Text-to-SQL", "DuckDB Querying", "Tabular Exports"],
  },
  {
    icon: ShieldCheck,
    title: "Defense & Enterprise Security",
    desc: "Strict read-only AST SQL parsing blocks DROP, DELETE, or ALTER operations. Designed for air-gapped environments and mission-critical helicopter operations.",
    tags: ["AST Validation", "Air-Gap Ready", "Zero Data Leak"],
  },
];

const WORKFLOW_STEPS = [
  {
    step: "01",
    title: "Ingest Fleet Data or Aerial Imagery",
    desc: "Drag and drop your helicopter maintenance logs, operational telemetries (CSV, Excel, Parquet), or aerial photographs into the secure upload interface.",
    badge: "Multimodal Input",
  },
  {
    step: "02",
    title: "Dual-Engine AI & Schema Processing",
    desc: "DuckDB creates an instant in-memory analytical catalog while vision models evaluate rotor systems, tail configurations, and airframe geometry.",
    badge: "Sub-Second Ingestion",
  },
  {
    step: "03",
    title: "Multilingual Voice & Query Exploration",
    desc: "Ask questions in English, Hindi, or Kannada using text or your microphone. Switch between Natural Language and direct SQL query modes seamlessly.",
    badge: "NLP + Speech AI",
  },
  {
    step: "04",
    title: "Actionable Intelligence & Correlation",
    desc: "Review interactive visualizations, query data tables, and cross-reference photographs against fleet candidates with calculated match confidence scores.",
    badge: "Fleet Readiness",
  },
];

const STATS_CARDS = [
  { label: "Query Speed", value: "< 250ms", sub: "DuckDB In-Memory Engine" },
  { label: "Languages", value: "3 Ready", sub: "English, Hindi, Kannada" },
  { label: "Security", value: "100%", sub: "Read-Only AST Validation" },
  { label: "Max Dataset", value: "50 MB", sub: "Up to 1M+ rows supported" },
];

export default function LandingOverlay({ onStart }: LandingOverlayProps) {
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [activeSection, setActiveSection] = useState("home");
  const { theme, toggleTheme } = useTheme();

  const handleStart = () => {
    setIsTransitioning(true);
    setTimeout(() => onStart(), 700);
  };

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col hero-bg select-none">
      {/* ── Atmospheric background gradient blobs ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -right-32 w-[650px] h-[650px] rounded-full bg-purple-300/25 dark:bg-purple-600/10 blur-[100px]" />
        <div className="absolute top-1/3 -left-32 w-[500px] h-[500px] rounded-full bg-pink-200/25 dark:bg-pink-600/10 blur-[100px]" />
        <div className="absolute top-2/3 right-1/4 w-[500px] h-[500px] rounded-full bg-blue-200/25 dark:bg-blue-600/10 blur-[100px]" />
        <div className="absolute -bottom-32 left-1/3 w-[600px] h-[600px] rounded-full bg-purple-200/20 dark:bg-purple-800/10 blur-[120px]" />
      </div>

      {/* ── STICKY TOP NAVIGATION ── */}
      <header className="sticky top-0 z-40 w-full glass border-b border-[var(--border)]">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          {/* Brand Logo */}
          <div
            onClick={() => scrollToSection("home")}
            className="flex items-center gap-3 cursor-pointer"
          >
            <HelicopterLogo size={38} />
            <div>
              <div className="font-extrabold text-xl leading-none text-[var(--text-primary)] tracking-tight">
                Heli<span className="text-gradient">Xpert</span>
              </div>
            </div>
          </div>

          {/* Nav links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-[var(--text-secondary)]">
            {[
              { id: "home", label: "Home" },
              { id: "features", label: "Features" },
              { id: "how-it-works", label: "How It Works" },
              { id: "about", label: "About" },
            ].map(({ id, label }) => (
              <button
                key={id}
                onClick={() => scrollToSection(id)}
                className={`transition-colors py-1 ${
                  activeSection === id
                    ? "text-[var(--accent)] font-semibold border-b-2 border-[var(--accent)]"
                    : "hover:text-[var(--accent)]"
                }`}
              >
                {label}
              </button>
            ))}
          </nav>

          {/* Right Controls: Theme + Launch CTA */}
          <div className="flex items-center gap-3">
            {/* Theme toggle slider */}
            <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-full glass border border-purple-200/40 dark:border-purple-800/30">
              <Sun
                className={`w-3.5 h-3.5 ${
                  theme === "light" ? "text-amber-500" : "text-slate-400"
                }`}
              />
              <button
                onClick={toggleTheme}
                aria-label="Toggle theme"
                className={`relative w-10 h-5 rounded-full transition-colors duration-300 focus:outline-none ${
                  theme === "dark" ? "bg-violet-600" : "bg-purple-200"
                }`}
              >
                <motion.span
                  layout
                  className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-md transition-transform duration-300 ${
                    theme === "dark" ? "translate-x-5" : "translate-x-0.5"
                  }`}
                />
              </button>
              <Moon
                className={`w-3.5 h-3.5 ${
                  theme === "dark" ? "text-purple-300" : "text-slate-400"
                }`}
              />
            </div>

            {/* Quick Get Started Button */}
            <button
              onClick={handleStart}
              className="btn-primary hidden sm:inline-flex text-xs px-5 py-2 rounded-full font-semibold shadow-md shadow-purple-500/20 items-center gap-1.5"
            >
              <span>Get Started</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════
          SECTION 1: HOME / HERO
      ═══════════════════════════════════════════════ */}
      <section
        id="home"
        className="relative z-10 w-full max-w-7xl mx-auto px-6 pt-10 pb-12 flex flex-col justify-center"
      >
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center min-h-[500px]">
          {/* Left Hero Content (cols 5) */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="lg:col-span-5 space-y-6"
          >
            {/* Pill Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full glass border border-purple-300/40 dark:border-purple-500/30 text-[var(--accent)] text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span>AI-Powered Helicopter Intelligence</span>
            </div>

            {/* Headline */}
            <div className="space-y-1">
              <h1 className="text-5xl sm:text-6xl font-black tracking-tight text-[var(--text-primary)]">
                Heli<span className="text-gradient">Xpert</span>
              </h1>
              <div className="text-3xl sm:text-4xl font-extrabold text-[var(--text-primary)] tracking-tight">
                Intelligent Insights.
              </div>
              <div className="text-3xl sm:text-4xl font-extrabold text-gradient tracking-tight">
                Powered by Data.
              </div>
            </div>

            {/* Description */}
            <p className="text-sm sm:text-base text-[var(--text-secondary)] max-w-md leading-relaxed">
              Upload helicopter datasets, ask questions, analyze images and get
              intelligent insights — all in one place.
            </p>

            {/* CTA Button */}
            <div className="pt-2">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleStart}
                className="btn-primary text-sm px-8 py-3.5 rounded-full shadow-lg shadow-purple-500/30 font-semibold inline-flex items-center gap-2"
              >
                <span>Get Started</span>
                <ArrowRight className="w-4 h-4" />
              </motion.button>
            </div>
          </motion.div>

          {/* Right Hero Helicopter Visual (cols 7) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, ease: "easeOut", delay: 0.1 }}
            className="lg:col-span-7 relative flex items-center justify-center"
          >
            {/* Ambient Backlight Glow */}
            <div className="absolute w-[450px] h-[300px] rounded-full bg-gradient-to-r from-purple-400/20 via-pink-400/20 to-blue-400/20 blur-3xl pointer-events-none" />

            {/* Realistic Airbus H145 with gentle hovering levitation */}
            <motion.div
              animate={
                isTransitioning
                  ? { scale: 1.15, y: -40, opacity: 0 }
                  : { y: [-6, 6, -6] }
              }
              transition={
                isTransitioning
                  ? { duration: 0.7, ease: "easeInOut" }
                  : { duration: 4.5, repeat: Infinity, ease: "easeInOut" }
              }
              className="relative w-full max-w-[620px] flex items-center justify-center cursor-pointer"
              onClick={handleStart}
            >
              <img
                src="/helicopter_hero_clean.png"
                alt="Airbus H145 AI Helicopter"
                className="w-full h-auto object-contain drop-shadow-2xl select-none"
                style={{
                  filter: "drop-shadow(0 20px 30px rgba(124, 58, 237, 0.18))",
                }}
              />
            </motion.div>
          </motion.div>
        </div>

        {/* ── TOP 5 FEATURES ROW (From reference image) ── */}
        <div className="mt-8 pt-6 border-t border-[var(--border)]">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {TOP_FEATURES.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                onClick={() => scrollToSection("features")}
                className="flex flex-col items-center text-center p-3 rounded-2xl glass hover:border-purple-300/50 transition-all duration-300 cursor-pointer"
              >
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center mb-2.5 shadow-sm"
                  style={{
                    background: "var(--accent-light)",
                    border: "1px solid var(--border-hover)",
                  }}
                >
                  <Icon className="w-5 h-5" style={{ color: "var(--accent)" }} />
                </div>
                <div className="text-xs font-bold text-[var(--text-primary)]">
                  {title}
                </div>
                <div className="text-[11px] text-[var(--text-muted)] mt-0.5 leading-snug">
                  {desc}
                </div>
              </div>
            ))}
          </div>

          {/* Scroll Down Prompt */}
          <div className="mt-8 flex justify-center">
            <button
              onClick={() => scrollToSection("features")}
              className="flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--accent)] text-xs font-medium transition-colors"
            >
              <div
                className="w-4 h-6 rounded-full border-1.5 border-[var(--border-hover)] flex justify-center pt-1"
                style={{ borderWidth: "1.5px" }}
              >
                <motion.div
                  animate={{ y: [0, 4, 0], opacity: [1, 0.4, 1] }}
                  transition={{ duration: 1.8, repeat: Infinity }}
                  className="w-1 h-1.5 rounded-full bg-[var(--accent)]"
                />
              </div>
              <span>Scroll to explore full platform features</span>
              <ChevronDown className="w-3.5 h-3.5 animate-bounce" />
            </button>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          SECTION 2: FEATURES
      ═══════════════════════════════════════════════ */}
      <section
        id="features"
        className="relative z-10 w-full max-w-7xl mx-auto px-6 py-20 border-t border-[var(--border)]"
      >
        <div className="text-center max-w-3xl mx-auto space-y-3 mb-14">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full glass border border-purple-300/40 text-[var(--accent)] text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Comprehensive Aerospace Features</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[var(--text-primary)] tracking-tight">
            Engineered for Precision & Fleet Readiness
          </h2>
          <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
            HeliXpert unites high-speed in-memory database execution, computer
            vision airframe classification, and multilingual voice AI into an
            aerospace-grade operational intelligence suite.
          </p>
        </div>

        {/* 6 Grid Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {DETAILED_FEATURES.map(({ icon: Icon, title, desc, tags }) => (
            <motion.div
              key={title}
              whileHover={{ y: -4 }}
              className="p-6 rounded-3xl glass flex flex-col justify-between transition-all duration-300"
            >
              <div>
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5"
                  style={{
                    background: "var(--accent-light)",
                    border: "1px solid var(--border-hover)",
                  }}
                >
                  <Icon className="w-6 h-6" style={{ color: "var(--accent)" }} />
                </div>
                <h3 className="text-base font-bold text-[var(--text-primary)] mb-2">
                  {title}
                </h3>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed mb-5">
                  {desc}
                </p>
              </div>

              {/* Feature Tags */}
              <div className="flex flex-wrap gap-1.5 pt-3 border-t border-[var(--border)]">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2.5 py-0.5 rounded-full text-[10px] font-medium"
                    style={{
                      background: "var(--bg-tertiary)",
                      color: "var(--accent)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          SECTION 3: HOW IT WORKS
      ═══════════════════════════════════════════════ */}
      <section
        id="how-it-works"
        className="relative z-10 w-full max-w-7xl mx-auto px-6 py-20 border-t border-[var(--border)]"
      >
        <div className="text-center max-w-3xl mx-auto space-y-3 mb-14">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full glass border border-purple-300/40 text-[var(--accent)] text-xs font-semibold">
            <Zap className="w-3.5 h-3.5" />
            <span>Workflow Pipeline</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[var(--text-primary)] tracking-tight">
            How HeliXpert Works
          </h2>
          <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
            From raw fleet spreadsheets to deep photographic correlation in four
            seamless steps.
          </p>
        </div>

        {/* 4 Steps Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {WORKFLOW_STEPS.map(({ step, title, desc, badge }, idx) => (
            <div
              key={step}
              className="relative p-6 rounded-3xl glass flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-3xl font-black text-gradient font-mono">
                    {step}
                  </span>
                  <span
                    className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full"
                    style={{
                      background: "var(--accent-light)",
                      color: "var(--accent)",
                      border: "1px solid var(--border-hover)",
                    }}
                  >
                    {badge}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-[var(--text-primary)] mb-2">
                  {title}
                </h3>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  {desc}
                </p>
              </div>

              <div className="mt-5 pt-3 border-t border-[var(--border)] flex items-center gap-1.5 text-[11px] text-[var(--accent)] font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>Automated Execution</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          SECTION 4: ABOUT
      ═══════════════════════════════════════════════ */}
      <section
        id="about"
        className="relative z-10 w-full max-w-7xl mx-auto px-6 py-20 border-t border-[var(--border)]"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          {/* Left Narrative (cols 7) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full glass border border-purple-300/40 text-[var(--accent)] text-xs font-semibold">
              <Layers className="w-3.5 h-3.5" />
              <span>About HeliXpert & HAL Aviation</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[var(--text-primary)] tracking-tight">
              A Mission to Elevate Rotorcraft Analytics
            </h2>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              <strong>HeliXpert</strong> was conceived to eliminate operational
              friction in helicopter fleet management, component telemetry, and
              visual airframe verification. Developed with deep consideration for
              Hindustan Aeronautics Limited (HAL) platforms such as ALH Dhruv,
              LCH Prachand, LUH, and Cheetah/Chetak helicopters.
            </p>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              By combining Google Gemini multimodal vision intelligence with
              DuckDB's lightning-fast analytical SQL kernel, HeliXpert enables
              pilots, fleet engineers, and defense analysts to ask complex
              questions in plain English, Hindi, or Kannada and receive validated
              analytical results within milliseconds.
            </p>

            {/* HAL Platforms Covered */}
            <div className="p-4 rounded-2xl glass space-y-2">
              <div className="text-xs font-bold text-[var(--text-primary)]">
                Supported Fleet Platforms & Airframes:
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                {[
                  "HAL ALH Dhruv",
                  "HAL LCH Prachand",
                  "HAL LUH (Light Utility)",
                  "Airbus H145 / H125",
                  "Mil Mi-17 / V5",
                  "Boeing AH-64 Apache",
                  "HAL Chetak / Cheetah",
                ].map((name) => (
                  <span
                    key={name}
                    className="px-3 py-1 rounded-full text-xs font-medium"
                    style={{
                      background: "var(--bg-tertiary)",
                      color: "var(--text-primary)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    🚁 {name}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Right Metrics Grid (cols 5) */}
          <div className="lg:col-span-5 grid grid-cols-2 gap-4">
            {STATS_CARDS.map(({ label, value, sub }) => (
              <div
                key={label}
                className="p-5 rounded-3xl glass flex flex-col justify-between"
              >
                <div className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  {label}
                </div>
                <div className="my-2">
                  <span className="text-2xl sm:text-3xl font-black text-gradient">
                    {value}
                  </span>
                </div>
                <div className="text-[11px] text-[var(--text-secondary)]">
                  {sub}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Ready to Start Banner ── */}
        <div className="mt-16 p-8 sm:p-12 rounded-3xl glass border border-purple-300/40 text-center space-y-5">
          <h3 className="text-2xl sm:text-3xl font-black text-[var(--text-primary)]">
            Ready to explore helicopter intelligence?
          </h3>
          <p className="text-sm text-[var(--text-secondary)] max-w-xl mx-auto leading-relaxed">
            Ingest your fleet dataset or upload a rotorcraft photo now to experience
            sub-second SQL querying, voice exploration, and automated vision
            correlation.
          </p>
          <div className="pt-2 flex justify-center">
            <button
              onClick={handleStart}
              className="btn-primary text-sm px-9 py-4 rounded-full font-bold shadow-xl shadow-purple-500/25 inline-flex items-center gap-2"
            >
              <span>Launch HeliXpert Workspace</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          FOOTER
      ═══════════════════════════════════════════════ */}
      <footer className="relative z-10 w-full py-8 border-t border-[var(--border)] glass">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[var(--text-muted)]">
          <div className="flex items-center gap-3">
            <HelicopterLogo size={24} />
            <span className="font-semibold text-[var(--text-primary)]">
              HeliXpert
            </span>
            <span>•</span>
            <span>AI-Powered Helicopter Intelligence Platform</span>
          </div>

          <div className="flex items-center gap-6">
            <button onClick={() => scrollToSection("home")} className="hover:text-[var(--accent)]">
              Home
            </button>
            <button onClick={() => scrollToSection("features")} className="hover:text-[var(--accent)]">
              Features
            </button>
            <button onClick={() => scrollToSection("how-it-works")} className="hover:text-[var(--accent)]">
              How It Works
            </button>
            <button onClick={() => scrollToSection("about")} className="hover:text-[var(--accent)]">
              About
            </button>
          </div>

          <div>
            © 2026 HeliXpert. Built for HAL Aerospace & Defense.
          </div>
        </div>
      </footer>
    </div>
  );
}
