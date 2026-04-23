"use client";

import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { useToast } from "./shared";

export default function BatchProcessor() {
  const { showToast } = useToast();
  const [files, setFiles] = useState<File[]>([]);
  const [results, setResults] = useState<Map<string, any>>(new Map());
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = (fileList: FileList) => {
    const audioFiles = Array.from(fileList).filter((f) => f.type.startsWith("audio/"));
    setFiles((prev) => [...prev, ...audioFiles]);
  };

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const processAll = async () => {
    if (files.length === 0) return;
    setProcessing(true);
    setProgress(0);
    const newResults = new Map<string, any>();

    for (let i = 0; i < files.length; i++) {
      try {
        const fd = new FormData();
        fd.append("file", files[i]);
        const res = await fetch("/api/classify/upload", { method: "POST", body: fd });
        if (res.ok) {
          const data = await res.json();
          newResults.set(files[i].name, { success: true, data });
        } else {
          newResults.set(files[i].name, { success: false, error: `Error ${res.status}` });
        }
      } catch (err: any) {
        newResults.set(files[i].name, { success: false, error: err.message });
      }
      setProgress(Math.round(((i + 1) / files.length) * 100));
      setResults(new Map(newResults));
    }

    setProcessing(false);
    showToast(`Processed ${files.length} files!`, "success");
  };

  const exportCSV = () => {
    let csv = "Filename,Top Prediction,Confidence,Model\n";
    results.forEach((r, name) => {
      if (r.success && r.data.predictions?.length > 0) {
        const top = r.data.predictions[0];
        csv += `"${name}","${top.class}",${(top.confidence * 100).toFixed(1)}%,"${top.model || r.data.model_used || ""}"\n`;
      } else {
        csv += `"${name}","ERROR","",""\n`;
      }
    });
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `stimme_batch_${Date.now()}.csv`;
    a.click();
    showToast("CSV exported!", "success");
  };

  const exportJSON = () => {
    const data: any[] = [];
    results.forEach((r, name) => {
      if (r.success) data.push({ filename: name, ...r.data });
      else data.push({ filename: name, error: r.error });
    });
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `stimme_batch_${Date.now()}.json`;
    a.click();
    showToast("JSON exported!", "success");
  };

  // Stats
  const totalProcessed = results.size;
  const successCount = Array.from(results.values()).filter((r) => r.success).length;
  const topClasses = new Map<string, number>();
  results.forEach((r) => {
    if (r.success && r.data.predictions?.[0]) {
      const cls = r.data.predictions[0].class;
      topClasses.set(cls, (topClasses.get(cls) || 0) + 1);
    }
  });
  const sortedClasses = [...topClasses.entries()].sort((a, b) => b[1] - a[1]);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-[1200px] mx-auto">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-3">📦 Batch Processor</h1>
        <p className="text-apple-gray text-lg">Classify multiple audio files at once with one click</p>
      </div>

      {/* Upload zone */}
      <div
        onClick={() => inputRef.current?.click()}
        onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files); }}
        onDragOver={(e) => e.preventDefault()}
        className="glass-card p-10 text-center cursor-pointer hover:border-accent-blue/30 transition-all mb-8"
      >
        <input ref={inputRef} type="file" accept="audio/*" multiple className="hidden" onChange={(e) => e.target.files && addFiles(e.target.files)} />
        <div className="text-4xl mb-3">📦</div>
        <div className="font-semibold text-apple-white mb-1">Drop multiple audio files here</div>
        <div className="text-sm text-apple-gray">Select 2, 10, or 100 files — classify them all in one batch</div>
      </div>

      {files.length > 0 && (
        <div className="space-y-6">
          {/* File list + controls */}
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold">{files.length} file(s) queued</h3>
              <div className="flex gap-2">
                <button onClick={processAll} disabled={processing} className="px-5 py-2 rounded-xl bg-gradient-to-r from-accent-blue to-accent-purple text-white text-xs font-bold disabled:opacity-50">
                  {processing ? `Processing... ${progress}%` : "🚀 Classify All"}
                </button>
                <button onClick={() => setFiles([])} disabled={processing} className="px-3 py-2 rounded-xl bg-white/5 text-xs text-apple-gray hover:text-red-400 disabled:opacity-30">Clear All</button>
              </div>
            </div>

            {processing && (
              <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden mb-4">
                <div className="h-full rounded-full bg-gradient-to-r from-accent-blue to-accent-purple transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
            )}

            <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
              {files.map((f, i) => {
                const r = results.get(f.name);
                return (
                  <div key={i} className="flex items-center gap-3 py-2 px-3 rounded-lg bg-white/[0.02]">
                    <span>{r?.success ? "✅" : r ? "❌" : "⏳"}</span>
                    <span className="text-sm flex-1 truncate">{f.name}</span>
                    <span className="text-xs text-apple-gray">{(f.size / 1024).toFixed(0)} KB</span>
                    {r?.success && (
                      <span className="text-xs font-semibold text-accent-blue">{r.data.predictions?.[0]?.class}</span>
                    )}
                    {r?.success && (
                      <span className="text-xs text-apple-gray">{(r.data.predictions?.[0]?.confidence * 100).toFixed(0)}%</span>
                    )}
                    {!processing && <button onClick={() => removeFile(i)} className="text-xs text-apple-gray hover:text-red-400">✕</button>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Results summary */}
          {totalProcessed > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="glass-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold">Summary</h3>
                  <div className="flex gap-2">
                    <button onClick={exportCSV} className="px-3 py-1 rounded-lg bg-white/5 text-xs text-apple-gray hover:text-white">📄 CSV</button>
                    <button onClick={exportJSON} className="px-3 py-1 rounded-lg bg-white/5 text-xs text-apple-gray hover:text-white">📋 JSON</button>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 text-center mb-4">
                  <div className="p-3 rounded-xl bg-white/[0.03]">
                    <div className="text-2xl font-bold text-gradient">{totalProcessed}</div>
                    <div className="text-[10px] text-apple-gray">Processed</div>
                  </div>
                  <div className="p-3 rounded-xl bg-green-500/5">
                    <div className="text-2xl font-bold text-green-400">{successCount}</div>
                    <div className="text-[10px] text-apple-gray">Success</div>
                  </div>
                  <div className="p-3 rounded-xl bg-white/[0.03]">
                    <div className="text-2xl font-bold text-red-400">{totalProcessed - successCount}</div>
                    <div className="text-[10px] text-apple-gray">Failed</div>
                  </div>
                </div>
              </div>

              <div className="glass-card p-6">
                <h3 className="text-sm font-bold mb-4">Class Distribution</h3>
                <div className="space-y-2">
                  {sortedClasses.slice(0, 8).map(([cls, count]) => (
                    <div key={cls} className="flex items-center gap-3">
                      <span className="text-sm flex-1 truncate">{cls}</span>
                      <div className="w-24 h-1.5 rounded-full bg-white/10 overflow-hidden">
                        <div className="h-full bg-accent-blue/60 rounded-full" style={{ width: `${(count / files.length) * 100}%` }} />
                      </div>
                      <span className="text-xs text-apple-gray">{count}</span>
                    </div>
                  ))}
                  {sortedClasses.length === 0 && <div className="text-xs text-apple-gray text-center">No results yet</div>}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
