"use client";

import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { useToast } from "./shared";

interface AudioData {
  file: File;
  predictions: any[];
  buffer: AudioBuffer | null;
  model: string;
}

export default function ComparePanel() {
  const { showToast } = useToast();
  const [audioA, setAudioA] = useState<AudioData | null>(null);
  const [audioB, setAudioB] = useState<AudioData | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const refA = useRef<HTMLInputElement>(null);
  const refB = useRef<HTMLInputElement>(null);
  const canvasA = useRef<HTMLCanvasElement>(null);
  const canvasB = useRef<HTMLCanvasElement>(null);

  const processFile = useCallback(async (file: File, side: "A" | "B") => {
    setLoading(side);
    try {
      // Classify
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/classify/upload", { method: "POST", body: fd });
      if (!res.ok) throw new Error(`Error: ${res.status}`);
      const data = await res.json();

      // Decode for waveform
      const arrayBuf = await file.arrayBuffer();
      const audioCtx = new AudioContext();
      const buffer = await audioCtx.decodeAudioData(arrayBuf);
      audioCtx.close();

      const audioData: AudioData = {
        file,
        predictions: data.predictions || [],
        buffer,
        model: data.model_used || "",
      };

      if (side === "A") {
        setAudioA(audioData);
        setTimeout(() => { if (canvasA.current && buffer) drawWave(canvasA.current, buffer, "#60a5fa"); }, 100);
      } else {
        setAudioB(audioData);
        setTimeout(() => { if (canvasB.current && buffer) drawWave(canvasB.current, buffer, "#a855f7"); }, 100);
      }
      showToast(`Audio ${side} classified!`, "success");
    } catch (err: any) {
      showToast(`Failed: ${err.message}`, "error");
    } finally {
      setLoading(null);
    }
  }, [showToast]);

  const drawWave = (canvas: HTMLCanvasElement, buffer: AudioBuffer, color: string) => {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const data = buffer.getChannelData(0);
    const w = canvas.width = canvas.parentElement?.clientWidth || 400;
    const h = canvas.height = 80;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.fillRect(0, 0, w, h);

    const step = Math.ceil(data.length / w);
    const cy = h / 2;
    ctx.fillStyle = color;
    for (let i = 0; i < w; i++) {
      let min = 1, max = -1;
      for (let j = 0; j < step; j++) {
        const d = data[i * step + j];
        if (d < min) min = d;
        if (d > max) max = d;
      }
      ctx.fillRect(i, cy + min * cy * 0.85, 1, (max - min) * cy * 0.85 || 1);
    }
  };

  // Comparison metrics
  const getMatch = () => {
    if (!audioA?.predictions.length || !audioB?.predictions.length) return null;

    const topA = audioA.predictions[0];
    const topB = audioB.predictions[0];
    const sameClass = topA.class === topB.class;

    // Calculate overlap of prediction classes
    const classesA = new Set(audioA.predictions.slice(0, 5).map((p: any) => p.class));
    const classesB = new Set(audioB.predictions.slice(0, 5).map((p: any) => p.class));
    let overlap = 0;
    classesA.forEach((c) => { if (classesB.has(c)) overlap++; });
    const similarity = Math.round((overlap / Math.max(classesA.size, classesB.size)) * 100);

    return { topA, topB, sameClass, similarity, overlap };
  };

  const match = getMatch();

  const AudioCard = ({ side, data, inputRef, loading: isLoading }: { side: string; data: AudioData | null; inputRef: React.RefObject<HTMLInputElement | null>; loading: boolean }) => (
    <div className="space-y-4">
      <h3 className="text-sm font-bold text-center">Audio {side}</h3>
      {!data ? (
        <div onClick={() => inputRef.current?.click()} className="glass-card p-10 text-center cursor-pointer hover:border-accent-blue/30">
          <input ref={inputRef} type="file" accept="audio/*" className="hidden" onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0], side as "A" | "B")} />
          <div className="text-3xl mb-3">{isLoading ? "⏳" : "📁"}</div>
          <div className="text-sm font-medium">{isLoading ? "Processing..." : `Upload Audio ${side}`}</div>
        </div>
      ) : (
        <div className="glass-card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium truncate flex-1">{data.file.name}</div>
            <button onClick={() => side === "A" ? setAudioA(null) : setAudioB(null)} className="text-xs text-apple-gray hover:text-red-400">✕</button>
          </div>
          <div className="text-xs text-apple-gray">{(data.file.size / 1024).toFixed(1)} KB • {data.buffer ? `${data.buffer.duration.toFixed(1)}s` : ""}</div>

          <div className="rounded-xl overflow-hidden border border-white/[0.06]">
            <canvas ref={side === "A" ? canvasA : canvasB} className="w-full block" style={{ height: "80px" }} />
          </div>

          {data.predictions.length > 0 && (
            <div>
              <div className="text-center mb-3">
                <div className="text-3xl mb-1">{getIcon(data.predictions[0].class)}</div>
                <div className="text-lg font-bold">{data.predictions[0].class}</div>
                <div className="text-xs text-apple-gray">{(data.predictions[0].confidence * 100).toFixed(1)}%</div>
              </div>
              <div className="space-y-1">
                {data.predictions.slice(0, 5).map((p: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <span className="text-apple-gray w-4">{i + 1}</span>
                    <span className="flex-1 truncate">{p.class}</span>
                    <div className="w-14 h-1 rounded-full bg-white/10 overflow-hidden">
                      <div className={`h-full rounded-full ${side === "A" ? "bg-blue-500/70" : "bg-purple-500/70"}`} style={{ width: `${p.confidence * 100}%` }} />
                    </div>
                    <span className="text-apple-gray w-10 text-right">{(p.confidence * 100).toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-[1200px] mx-auto">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-3">🔄 Audio Compare</h1>
        <p className="text-apple-gray text-lg">Compare two audio files side-by-side</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <AudioCard side="A" data={audioA} inputRef={refA} loading={loading === "A"} />
        <AudioCard side="B" data={audioB} inputRef={refB} loading={loading === "B"} />
      </div>

      {/* Comparison Result */}
      {match && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-8 glass-card p-8 text-center">
          <h3 className="text-lg font-bold mb-6">Comparison Result</h3>
          <div className="grid grid-cols-3 gap-6">
            <div className="p-4 rounded-xl bg-white/[0.03]">
              <div className="text-3xl mb-2">{match.sameClass ? "✅" : "❌"}</div>
              <div className="text-sm font-semibold">{match.sameClass ? "Same Class" : "Different Class"}</div>
              <div className="text-xs text-apple-gray mt-1">{match.topA.class} vs {match.topB.class}</div>
            </div>
            <div className="p-4 rounded-xl bg-white/[0.03]">
              <div className="text-3xl font-bold text-gradient mb-2">{match.similarity}%</div>
              <div className="text-sm font-semibold">Similarity</div>
              <div className="text-xs text-apple-gray mt-1">{match.overlap} shared predictions</div>
            </div>
            <div className="p-4 rounded-xl bg-white/[0.03]">
              <div className="text-3xl mb-2">📊</div>
              <div className="text-sm font-semibold">Confidence</div>
              <div className="text-xs text-apple-gray mt-1">
                A: {(match.topA.confidence * 100).toFixed(0)}% | B: {(match.topB.confidence * 100).toFixed(0)}%
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

function getIcon(cls: string): string {
  const l = cls.toLowerCase();
  if (l.includes("bird")) return "🐦";
  if (l.includes("dog")) return "🐕";
  if (l.includes("cat")) return "🐱";
  if (l.includes("car") || l.includes("engine")) return "🚗";
  if (l.includes("speech") || l.includes("voice")) return "🗣️";
  if (l.includes("music")) return "🎵";
  if (l.includes("rain")) return "🌧️";
  return "🔊";
}
