"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { useToast } from "./shared";

export default function SpeechToText() {
  const { showToast } = useToast();
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimText, setInterimText] = useState("");
  const [language, setLanguage] = useState("en-US");
  const [words, setWords] = useState<{ text: string; time: string; final: boolean }[]>([]);
  const [stats, setStats] = useState({ words: 0, chars: 0, duration: 0 });
  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  const languages = [
    { code: "en-US", label: "English (US)", flag: "🇺🇸" },
    { code: "en-GB", label: "English (UK)", flag: "🇬🇧" },
    { code: "hi-IN", label: "Hindi", flag: "🇮🇳" },
    { code: "es-ES", label: "Spanish", flag: "🇪🇸" },
    { code: "fr-FR", label: "French", flag: "🇫🇷" },
    { code: "de-DE", label: "German", flag: "🇩🇪" },
    { code: "ja-JP", label: "Japanese", flag: "🇯🇵" },
    { code: "zh-CN", label: "Chinese", flag: "🇨🇳" },
    { code: "ar-SA", label: "Arabic", flag: "🇸🇦" },
    { code: "pt-BR", label: "Portuguese", flag: "🇧🇷" },
    { code: "ru-RU", label: "Russian", flag: "🇷🇺" },
    { code: "ko-KR", label: "Korean", flag: "🇰🇷" },
  ];

  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showToast("Speech Recognition not supported. Use Chrome or Edge.", "error");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      startTimeRef.current = Date.now();
      timerRef.current = setInterval(() => {
        setStats((s) => ({ ...s, duration: Math.floor((Date.now() - startTimeRef.current) / 1000) }));
      }, 1000);
    };

    recognition.onresult = (event: any) => {
      let final = "";
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += text;
          setWords((prev) => [...prev, { text, time: new Date().toLocaleTimeString(), final: true }]);
        } else {
          interim += text;
        }
      }
      if (final) {
        setTranscript((prev) => prev + final);
        setStats((s) => ({
          ...s,
          words: (s.words || 0) + final.trim().split(/\s+/).filter(Boolean).length,
          chars: (s.chars || 0) + final.length,
        }));
      }
      setInterimText(interim);
    };

    recognition.onerror = (event: any) => {
      if (event.error !== "no-speech") {
        showToast(`Speech error: ${event.error}`, "error");
      }
    };

    recognition.onend = () => {
      // Auto restart if still supposed to be listening
      if (recognitionRef.current) {
        try { recognition.start(); } catch { /* ignore */ }
      }
    };

    recognition.start();
    recognitionRef.current = recognition;
    showToast("Listening...", "success");
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsListening(false);
    setInterimText("");
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const clearAll = () => {
    setTranscript("");
    setInterimText("");
    setWords([]);
    setStats({ words: 0, chars: 0, duration: 0 });
  };

  const copyText = () => {
    navigator.clipboard.writeText(transcript);
    showToast("Copied to clipboard!", "success");
  };

  const downloadText = () => {
    const blob = new Blob([transcript], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `stimme_transcript_${Date.now()}.txt`;
    a.click();
    showToast("Downloaded!", "success");
  };

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const formatDuration = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-[1200px] mx-auto">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-3">🗣️ Speech-to-Text</h1>
        <p className="text-apple-gray text-lg">Real-time speech recognition with multi-language support</p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-4 items-center justify-center mb-8">
        <select value={language} onChange={(e) => setLanguage(e.target.value)} disabled={isListening} className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white">
          {languages.map((l) => <option key={l.code} value={l.code}>{l.flag} {l.label}</option>)}
        </select>
        <button
          onClick={isListening ? stopListening : startListening}
          className={`px-8 py-3 rounded-xl text-sm font-bold transition-all ${
            isListening
              ? "bg-red-500/20 border-2 border-red-500 text-red-400"
              : "bg-gradient-to-r from-accent-blue to-accent-purple text-white hover:scale-105"
          }`}
        >
          {isListening ? "⏹ Stop" : "🎙️ Start Listening"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main transcript */}
        <div className="lg:col-span-2 space-y-4">
          {/* Live indicator */}
          {isListening && (
            <div className="glass-card p-3 flex items-center gap-3">
              <div className="flex gap-1 items-center">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" style={{ animationDelay: "0.2s" }} />
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" style={{ animationDelay: "0.4s" }} />
              </div>
              <span className="text-xs text-red-400 font-semibold">LIVE — Listening in {languages.find((l) => l.code === language)?.label}</span>
            </div>
          )}

          {/* Transcript area */}
          <div className="glass-card p-6 min-h-[300px]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold">Transcript</h2>
              <div className="flex gap-2">
                <button onClick={copyText} disabled={!transcript} className="px-3 py-1 rounded-lg bg-white/5 text-xs text-apple-gray hover:text-white disabled:opacity-30">📋 Copy</button>
                <button onClick={downloadText} disabled={!transcript} className="px-3 py-1 rounded-lg bg-white/5 text-xs text-apple-gray hover:text-white disabled:opacity-30">⬇️ Save</button>
                <button onClick={clearAll} disabled={!transcript} className="px-3 py-1 rounded-lg bg-white/5 text-xs text-apple-gray hover:text-red-400 disabled:opacity-30">✕ Clear</button>
              </div>
            </div>
            <div className="text-sm leading-relaxed text-apple-white whitespace-pre-wrap">
              {transcript || (
                <span className="text-apple-gray italic">
                  {isListening ? "Start speaking..." : "Click 'Start Listening' and speak into your microphone"}
                </span>
              )}
              {interimText && (
                <span className="text-accent-blue/70 italic">{interimText}</span>
              )}
            </div>
          </div>
        </div>

        {/* Side panel */}
        <div className="space-y-4">
          {/* Stats */}
          <div className="glass-card p-5">
            <h3 className="text-xs font-bold text-apple-gray uppercase mb-3">Stats</h3>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <div className="text-xl font-bold text-gradient">{stats.words}</div>
                <div className="text-[10px] text-apple-gray">Words</div>
              </div>
              <div>
                <div className="text-xl font-bold text-apple-white">{stats.chars}</div>
                <div className="text-[10px] text-apple-gray">Chars</div>
              </div>
              <div>
                <div className="text-xl font-bold text-apple-white">{formatDuration(stats.duration)}</div>
                <div className="text-[10px] text-apple-gray">Duration</div>
              </div>
            </div>
          </div>

          {/* Word timeline */}
          <div className="glass-card p-5">
            <h3 className="text-xs font-bold text-apple-gray uppercase mb-3">Word Timeline</h3>
            <div className="space-y-1.5 max-h-[250px] overflow-y-auto">
              {words.slice(-20).map((w, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <span className="text-apple-gray shrink-0">{w.time}</span>
                  <span className="text-apple-white truncate">{w.text}</span>
                </div>
              ))}
              {words.length === 0 && <div className="text-xs text-apple-gray text-center py-4">No words yet</div>}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
