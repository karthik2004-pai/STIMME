"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ToastProvider } from "@/components/shared";
import IdentifyPanel from "@/components/IdentifyPanel";
import IntelPanel from "@/components/IntelPanel";
import ClassesPanel from "@/components/ClassesPanel";
import TrainPanel from "@/components/TrainPanel";
import ModelsPanel from "@/components/ModelsPanel";
import HistoryPanel from "@/components/HistoryPanel";
import LiveMonitor from "@/components/LiveMonitor";
import SpeechToText from "@/components/SpeechToText";
import BatchProcessor from "@/components/BatchProcessor";
import AnalyzePanel from "@/components/AnalyzePanel";
import ComparePanel from "@/components/ComparePanel";
import VoiceMatchPanel from "@/components/VoiceMatchPanel";
import Chatbot from "@/components/Chatbot";

const pages = [
  { id: "identify", label: "Identify", icon: "🎯" },
  { id: "voicematch", label: "Voice ID", icon: "🔐" },
  { id: "live", label: "Live Monitor", icon: "📡" },
  { id: "speech", label: "Speech", icon: "🗣️" },
  { id: "analyze", label: "Analyze", icon: "🔬" },
  { id: "intel", label: "Intel", icon: "🛡️" },
  { id: "compare", label: "Compare", icon: "🔄" },
  { id: "batch", label: "Batch", icon: "📦" },
  { id: "classes", label: "Classes", icon: "📂" },
  { id: "train", label: "Train", icon: "🧠" },
  { id: "models", label: "Models", icon: "⚡" },
  { id: "history", label: "History", icon: "📊" },
];

export default function AppDashboard() {
  const [currentPage, setCurrentPage] = useState("identify");
  const [modelStatus, setModelStatus] = useState("Connecting...");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch("/api/models/active");
        const data = await res.json();
        setModelStatus(`${data.active_model || "loading..."}`);
      } catch {
        setModelStatus("Connecting...");
        setTimeout(check, 3000);
      }
    };
    check();
  }, []);

  return (
    <ToastProvider>
      <div className="min-h-screen bg-black text-apple-white">
        {/* Top Navigation Bar */}
        <nav className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/[0.06]">
          <div className="max-w-[1600px] mx-auto px-3 h-12 flex items-center justify-between">
            {/* Left: Logo + Hamburger */}
            <div className="flex items-center gap-3">
              <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-sm">
                ☰
              </button>
              <a href="/" className="flex items-center gap-2 group">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-accent-blue to-accent-purple flex items-center justify-center">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" x2="12" y1="19" y2="22" />
                  </svg>
                </div>
                <div className="hidden sm:block">
                  <span className="text-sm font-semibold tracking-tight">Stimme</span>
                  <span className="text-[10px] text-apple-gray ml-1">AI Suite</span>
                </div>
              </a>
            </div>

            {/* Center: Nav links (desktop) */}
            <div className="hidden lg:flex items-center gap-0.5 bg-white/[0.03] rounded-xl p-0.5 border border-white/[0.06]">
              {pages.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setCurrentPage(p.id)}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all whitespace-nowrap ${
                    currentPage === p.id
                      ? "bg-white/10 text-apple-white shadow-sm"
                      : "text-apple-gray hover:text-apple-white"
                  }`}
                >
                  <span className="mr-0.5">{p.icon}</span>{p.label}
                </button>
              ))}
            </div>

            {/* Right: Status */}
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-[11px] text-apple-gray hidden sm:block">{modelStatus}</span>
            </div>
          </div>
        </nav>

        {/* Mobile Sidebar */}
        <AnimatePresence>
          {sidebarOpen && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSidebarOpen(false)} className="fixed inset-0 z-40 bg-black/60 lg:hidden" />
              <motion.div initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }} className="fixed left-0 top-0 bottom-0 z-50 w-[260px] bg-black/95 backdrop-blur-xl border-r border-white/[0.06] p-4 pt-16 lg:hidden">
                <div className="space-y-1">
                  {pages.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => { setCurrentPage(p.id); setSidebarOpen(false); }}
                      className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-3 ${
                        currentPage === p.id ? "bg-white/10 text-white" : "text-apple-gray hover:text-white hover:bg-white/5"
                      }`}
                    >
                      <span>{p.icon}</span>{p.label}
                    </button>
                  ))}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Content */}
        <main className="pt-16 pb-12 px-3 sm:px-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPage}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
            >
              {currentPage === "identify" && <IdentifyPanel />}
              {currentPage === "voicematch" && <VoiceMatchPanel />}
              {currentPage === "live" && <LiveMonitor />}
              {currentPage === "speech" && <SpeechToText />}
              {currentPage === "analyze" && <AnalyzePanel />}
              {currentPage === "intel" && <IntelPanel />}
              {currentPage === "compare" && <ComparePanel />}
              {currentPage === "batch" && <BatchProcessor />}
              {currentPage === "classes" && <ClassesPanel />}
              {currentPage === "train" && <TrainPanel />}
              {currentPage === "models" && <ModelsPanel />}
              {currentPage === "history" && <HistoryPanel />}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Chatbot */}
        <Chatbot />
      </div>
    </ToastProvider>
  );
}
