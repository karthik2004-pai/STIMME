"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useToast } from "./shared";

export default function TrainPanel() {
  const { showToast } = useToast();
  const [classes, setClasses] = useState<any[]>([]);
  const [architectures, setArchitectures] = useState<any[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [arch, setArch] = useState("yamnet_transfer");
  const [modelName, setModelName] = useState("");
  const [epochs, setEpochs] = useState(30);
  const [training, setTraining] = useState(false);
  const [progress, setProgress] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [clsRes, modRes] = await Promise.all([
        fetch("/api/classes").then((r) => r.json()),
        fetch("/api/models").then((r) => r.json()),
      ]);
      setClasses((clsRes.classes || []).filter((c: any) => c.sample_count > 0));
      setArchitectures(modRes.architectures || [
        { id: "yamnet_transfer", name: "YAMNet Transfer Learning", description: "Fast and accurate", recommended: true, training_time: "~1-2 min", min_samples: 10 },
        { id: "custom_cnn", name: "Custom CNN", description: "Trains from scratch", recommended: false, training_time: "~5-10 min", min_samples: 50 },
      ]);
    } catch {
      showToast("Failed to load data", "error");
    }
  };

  const toggleClass = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const startTraining = async () => {
    if (selected.size < 2) {
      showToast("Select at least 2 classes", "error");
      return;
    }
    setTraining(true);
    setProgress(null);
    try {
      const fd = new FormData();
      fd.append("class_ids", [...selected].join(","));
      fd.append("architecture", arch);
      if (modelName) fd.append("model_name", modelName);
      fd.append("epochs", String(epochs));
      const res = await fetch("/api/training/start", { method: "POST", body: fd });
      if (!res.ok) throw new Error(`Error: ${res.status}`);
      showToast("Training started!", "success");
      pollStatus();
    } catch (err: any) {
      showToast(`Training failed: ${err.message}`, "error");
      setTraining(false);
    }
  };

  const pollStatus = async () => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/training/status");
        const data = await res.json();
        setProgress(data);
        if (data.status === "completed" || data.status === "failed" || data.status === "idle") {
          clearInterval(interval);
          setTraining(false);
          if (data.status === "completed") showToast("Training completed! ✓", "success");
          if (data.status === "failed") showToast("Training failed", "error");
        }
      } catch {
        clearInterval(interval);
        setTraining(false);
      }
    }, 2000);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-[1200px] mx-auto">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-3">🧠 Train Model</h1>
        <p className="text-apple-gray text-lg">Select classes and architecture to train a custom classifier</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Config */}
        <div className="glass-card p-8 space-y-6">
          <div>
            <h3 className="text-sm font-bold text-apple-white mb-3">1. Select Classes</h3>
            {classes.length === 0 ? (
              <p className="text-sm text-apple-gray">No classes with samples. Upload samples first.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {classes.map((c) => (
                  <button key={c.id} onClick={() => toggleClass(c.id)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${selected.has(c.id) ? "bg-accent-blue/20 border border-accent-blue/40 text-accent-blue" : "bg-white/5 border border-white/10 text-apple-gray hover:text-white"}`}>
                    {c.icon} {c.name} ({c.sample_count})
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <h3 className="text-sm font-bold text-apple-white mb-3">2. Choose Architecture</h3>
            <div className="space-y-2">
              {architectures.map((a) => (
                <button key={a.id} onClick={() => setArch(a.id)} className={`w-full text-left p-4 rounded-xl transition-all ${arch === a.id ? "bg-accent-blue/10 border border-accent-blue/30" : "bg-white/[0.03] border border-white/[0.06] hover:border-white/15"}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-apple-white">{a.name}</span>
                    {a.recommended && <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-400">Recommended</span>}
                  </div>
                  <div className="text-xs text-apple-gray mt-1">{a.description} • {a.training_time} • Min {a.min_samples} samples/class</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-apple-gray block mb-1">Model Name (optional)</label>
            <input value={modelName} onChange={(e) => setModelName(e.target.value)} placeholder="Auto-generated" className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-accent-blue/40" />
          </div>
          <div>
            <label className="text-xs font-medium text-apple-gray block mb-1">Epochs</label>
            <input type="number" value={epochs} onChange={(e) => setEpochs(Number(e.target.value))} min={5} max={200} className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-accent-blue/40" />
          </div>

          <button onClick={startTraining} disabled={training || selected.size < 2} className="w-full py-3 rounded-xl bg-gradient-to-r from-accent-blue to-accent-purple text-white font-semibold text-sm disabled:opacity-50">
            {training ? "Training..." : "🚀 Start Training"}
          </button>
        </div>

        {/* Progress */}
        <div>
          {progress && training ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-8">
              <h3 className="text-lg font-bold mb-6">Training Progress</h3>
              <div className="w-full h-3 rounded-full bg-white/10 overflow-hidden mb-4">
                <div className="h-full rounded-full bg-gradient-to-r from-accent-blue to-accent-purple transition-all duration-500" style={{ width: `${progress.progress || 0}%` }} />
              </div>
              <p className="text-sm text-apple-gray mb-4">{progress.message || "Training..."}</p>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-3 rounded-xl bg-white/[0.03]">
                  <div className="text-lg font-bold">{progress.epoch || 0}/{progress.total_epochs || epochs}</div>
                  <div className="text-xs text-apple-gray">Epoch</div>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.03]">
                  <div className="text-lg font-bold">{((progress.accuracy || 0) * 100).toFixed(0)}%</div>
                  <div className="text-xs text-apple-gray">Accuracy</div>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.03]">
                  <div className="text-lg font-bold">{((progress.val_accuracy || 0) * 100).toFixed(0)}%</div>
                  <div className="text-xs text-apple-gray">Val Accuracy</div>
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="glass-card p-12 text-center">
              <div className="text-4xl mb-4">🧠</div>
              <div className="text-lg font-semibold mb-1">Configure Training</div>
              <div className="text-sm text-apple-gray">Select classes with audio samples and pick an architecture to begin</div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
