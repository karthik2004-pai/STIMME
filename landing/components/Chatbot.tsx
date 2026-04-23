"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Minimal knowledge base for the chatbot
const KB: Record<string, { keywords: string[]; title: string; answer: string }> = {
  general: { keywords: ["what is stimme", "about", "overview", "hello", "hi", "help", "hey"], title: "Welcome to Stimme", answer: "**Stimme** (German for \"Voice\") is an AI-powered Audio Intelligence Suite.\n\n🎯 **Identify** — Classify sounds using YAMNet (521 categories)\n🔬 **Analyze** — Deep spectral analysis with FFT\n🛡️ **Intel** — Forensics, speakers, steganography, threats, enhancement\n📂 **Classes** — Create custom sound categories\n🧠 **Train** — Build your own classifiers\n⚡ **Models** — Switch between models" },
  identify: { keywords: ["identify", "classify", "recognition", "detect", "upload"], title: "Identify Sound", answer: "Upload an audio file or record from your microphone, then click **Identify Sound**. YAMNet recognizes 521 sound types instantly." },
  record: { keywords: ["record", "microphone", "mic", "live", "capture"], title: "Recording", answer: "Click the 🎙️ button to start recording. Click again to stop. Then click **Identify Sound** to classify it." },
  intel: { keywords: ["intelligence", "intel", "forensics", "speaker", "steg", "threat", "enhance"], title: "Intel Suite", answer: "Upload audio and use: **Forensics** (tampering detection), **Speakers** (who spoke when), **Steganography** (hidden data), **Threats** (gunshots, explosions), **Enhancement** (noise removal)." },
  classes: { keywords: ["class", "category", "sample", "dataset", "create class"], title: "Classes", answer: "Go to **Classes** → Create a class → Upload 10+ audio samples per class. These samples are used to train custom models." },
  train: { keywords: ["train", "training", "custom model", "epochs", "cnn", "yamnet"], title: "Training", answer: "Select classes → Choose architecture (YAMNet Transfer recommended) → Set epochs → Click **Start Training**. Your model will be ready in ~1-2 minutes." },
  models: { keywords: ["model", "activate", "switch"], title: "Models", answer: "Go to **Models** to see all available classifiers. Click **Activate** to switch to a different model for classification." },
};

function findAnswer(q: string) {
  const query = q.toLowerCase();
  let best: typeof KB[string] | null = null;
  let bestScore = 0;
  for (const entry of Object.values(KB)) {
    let score = 0;
    for (const kw of entry.keywords) {
      if (query.includes(kw)) score += kw.split(" ").length * 3;
      for (const w of kw.split(" ")) {
        if (w.length > 2 && query.includes(w)) score += 1;
      }
    }
    if (score > bestScore) { bestScore = score; best = entry; }
  }
  return best && bestScore >= 2 ? best : KB.general;
}

interface Message {
  role: "user" | "bot";
  text: string;
}

export default function Chatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "bot", text: "👋 Hi! I'm the **Stimme Guide**. Ask me about any feature — identify, analyze, intel, classes, training, or models!" },
  ]);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = () => {
    const q = input.trim();
    if (!q) return;
    setMessages((prev) => [...prev, { role: "user", text: q }]);
    setInput("");
    setTimeout(() => {
      const answer = findAnswer(q);
      setMessages((prev) => [...prev, { role: "bot", text: answer.answer }]);
    }, 400);
  };

  return (
    <>
      {/* Toggle */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-accent-blue to-accent-purple flex items-center justify-center shadow-lg shadow-accent-blue/20 hover:scale-110 transition-transform"
      >
        <span className="text-xl">{open ? "✕" : "💬"}</span>
      </button>

      {/* Window */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 right-6 z-50 w-[380px] max-h-[500px] rounded-2xl overflow-hidden border border-white/10 bg-black/90 backdrop-blur-2xl flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-white/[0.06] flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent-blue to-accent-purple flex items-center justify-center text-sm">🤖</div>
              <div>
                <div className="text-sm font-semibold">Stimme Guide</div>
                <div className="text-xs text-green-400">● Online</div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[280px]">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] px-3 py-2 rounded-xl text-sm leading-relaxed ${
                    m.role === "user"
                      ? "bg-accent-blue/20 text-apple-white"
                      : "bg-white/5 text-apple-gray"
                  }`}>
                    {m.text.split("\n").map((line, j) => (
                      <span key={j}>
                        {line.replace(/\*\*(.*?)\*\*/g, "«$1»").split("«").map((part, k) => {
                          if (part.includes("»")) {
                            const [bold, rest] = part.split("»");
                            return <span key={k}><strong className="text-apple-white">{bold}</strong>{rest}</span>;
                          }
                          return <span key={k}>{part}</span>;
                        })}
                        {j < m.text.split("\n").length - 1 && <br />}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="p-3 border-t border-white/[0.06] flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder="Ask about any feature..."
                className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-apple-gray focus:outline-none focus:border-accent-blue/40"
              />
              <button onClick={send} className="w-9 h-9 rounded-xl bg-accent-blue/20 flex items-center justify-center text-accent-blue hover:bg-accent-blue/30 transition-colors">
                ➤
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
