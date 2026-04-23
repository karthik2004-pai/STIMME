"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useToast } from "./shared";

export default function ModelsPanel() {
  const { showToast } = useToast();
  const [models, setModels] = useState<any[]>([]);
  const [activeModel, setActiveModel] = useState("");

  useEffect(() => { loadModels(); }, []);

  const loadModels = async () => {
    try {
      const [modRes, actRes] = await Promise.all([
        fetch("/api/models").then((r) => r.json()),
        fetch("/api/models/active").then((r) => r.json()),
      ]);
      setModels(modRes.models || []);
      setActiveModel(actRes.active_model || "");
    } catch { showToast("Failed to load models", "error"); }
  };

  const activateModel = async (name: string) => {
    try {
      await fetch(`/api/models/${name}/activate`, { method: "POST" });
      setActiveModel(name);
      showToast(`Model "${name}" activated!`, "success");
    } catch { showToast("Failed to activate model", "error"); }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-[1200px] mx-auto">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-3">⚡ Models</h1>
        <p className="text-apple-gray text-lg">View available models and select the active classifier</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {models.map((m) => {
          const isActive = m.name === activeModel;
          return (
            <div key={m.name} className={`glass-card p-6 ${isActive ? "border-accent-blue/30" : ""}`}>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xl">{m.architecture === "yamnet" ? "🌐" : "🧠"}</span>
                {isActive && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-400">● Active</span>
                )}
              </div>
              <h3 className="text-sm font-bold text-apple-white mb-1">{m.name}</h3>
              <div className="text-xs text-apple-gray mb-1">{m.architecture || "Unknown"}</div>
              {m.num_classes && <div className="text-xs text-apple-gray">{m.num_classes} classes</div>}
              <div className="text-xs text-apple-gray mb-4">
                Status: {m.status === "loaded" ? "✅ Loaded" : m.status === "saved" ? "💾 Saved" : "🔴 Not loaded"}
              </div>
              {!isActive && (
                <button onClick={() => activateModel(m.name)} className="w-full py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-medium text-apple-white hover:bg-white/10 transition-colors">
                  Activate
                </button>
              )}
            </div>
          );
        })}
      </div>
      {models.length === 0 && (
        <div className="text-center py-12 text-apple-gray">No models available. Start the backend server first.</div>
      )}
    </motion.div>
  );
}
