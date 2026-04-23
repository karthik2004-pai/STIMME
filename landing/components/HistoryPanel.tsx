"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useToast } from "./shared";

export default function HistoryPanel() {
  const { showToast } = useToast();
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => { loadHistory(); }, []);

  const loadHistory = async () => {
    try {
      const res = await fetch("/api/classify/history?limit=50");
      const data = await res.json();
      setHistory(data.history || data || []);
    } catch { showToast("Failed to load history", "error"); }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-[1200px] mx-auto">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-3">📊 History</h1>
        <p className="text-apple-gray text-lg">Recent classification results and details</p>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="text-left px-4 py-3 text-xs font-semibold text-apple-gray uppercase">Time</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-apple-gray uppercase">Source</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-apple-gray uppercase">Filename</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-apple-gray uppercase">Prediction</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-apple-gray uppercase">Confidence</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-apple-gray uppercase">Model</th>
              </tr>
            </thead>
            <tbody>
              {(Array.isArray(history) ? history : []).map((h: any, i: number) => (
                <tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                  <td className="px-4 py-3 text-apple-gray text-xs">{h.timestamp ? new Date(h.timestamp).toLocaleString() : "—"}</td>
                  <td className="px-4 py-3">{h.source === "record" ? "🎙️" : "📁"}</td>
                  <td className="px-4 py-3 text-apple-white truncate max-w-[150px]">{h.filename || "—"}</td>
                  <td className="px-4 py-3 text-apple-white font-medium">{h.prediction || h.top_class || "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold ${(h.confidence || 0) > 0.5 ? "text-green-400" : "text-yellow-400"}`}>
                      {((h.confidence || 0) * 100).toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-apple-gray text-xs">{h.model_used || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {(!Array.isArray(history) || history.length === 0) && (
            <div className="text-center py-12">
              <div className="text-3xl mb-3">📊</div>
              <div className="text-apple-gray text-sm">No history yet. Classify some audio to see results.</div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
