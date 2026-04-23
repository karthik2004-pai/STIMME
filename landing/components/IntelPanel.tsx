"use client";

import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { useToast } from "./shared";

export default function IntelPanel() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState("speakers");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const tabs = [
    { id: "speakers", label: "🎭 Speakers", endpoint: "/api/intel/speakers" },
    { id: "steg", label: "🔐 Stego", endpoint: "/api/intel/steganalysis" },
    { id: "threats", label: "💥 Threats", endpoint: "/api/intel/threats" },
    { id: "enhance", label: "🧹 Enhance", endpoint: "/api/intel/enhance" },
  ];

  const runAnalysis = async (tab: typeof tabs[0]) => {
    if (!audioFile) {
      showToast("Please upload an audio file first", "error");
      return;
    }
    setLoading(true);
    setResults(null);
    try {
      const fd = new FormData();
      fd.append("file", audioFile);
      const res = await fetch(tab.endpoint, { method: "POST", body: fd });
      if (!res.ok) throw new Error(`Error: ${res.status}`);
      const data = await res.json();
      setResults({ tab: tab.id, data });
      showToast(`${tab.label.slice(2)} analysis complete!`, "success");
    } catch (err: any) {
      showToast(`Analysis failed: ${err.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleFile = (file: File) => {
    setAudioFile(file);
    setResults(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-[1200px] mx-auto"
    >
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-3">
          🛡️ Audio Intelligence
        </h1>
        <p className="text-apple-gray text-lg">
          Speakers · Steganography · Threats · Enhancement
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 justify-center mb-8">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              if (audioFile) runAnalysis(tab);
            }}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeTab === tab.id
                ? "bg-white/10 border border-white/20 text-apple-white"
                : "bg-white/[0.03] border border-white/[0.06] text-apple-gray hover:text-apple-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Upload */}
      {!audioFile ? (
        <div
          onClick={() => fileRef.current?.click()}
          className="glass-card p-12 text-center cursor-pointer hover:border-accent-blue/30 transition-all max-w-xl mx-auto"
        >
          <input
            ref={fileRef}
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          <div className="text-4xl mb-4">🛡️</div>
          <div className="font-semibold text-apple-white mb-1">
            Drop audio file for intelligence analysis
          </div>
          <div className="text-sm text-apple-gray">
            All processing is 100% local — no data leaves your system
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* File info */}
          <div className="glass-card p-4 flex items-center justify-between max-w-xl mx-auto">
            <div className="flex items-center gap-3">
              <span>🎵</span>
              <div>
                <div className="text-sm font-medium">{audioFile.name}</div>
                <div className="text-xs text-apple-gray">
                  {(audioFile.size / 1024).toFixed(1)} KB
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => runAnalysis(tabs.find((t) => t.id === activeTab)!)}
                disabled={loading}
                className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-accent-blue to-accent-purple text-white text-xs font-semibold disabled:opacity-50"
              >
                {loading ? "Analyzing..." : "Run Analysis"}
              </button>
              <button
                onClick={() => {
                  setAudioFile(null);
                  setResults(null);
                }}
                className="text-xs text-apple-gray hover:text-red-400"
              >
                ✕ Clear
              </button>
            </div>
          </div>

          {/* Results */}
          {loading && (
            <div className="text-center py-12">
              <div className="inline-block w-8 h-8 border-2 border-accent-blue/40 border-t-accent-blue rounded-full animate-spin mb-4" />
              <div className="text-apple-gray">Analyzing audio...</div>
            </div>
          )}

          {results && !loading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card p-8 max-w-3xl mx-auto"
            >
              <h2 className="text-lg font-bold mb-6">
                {tabs.find((t) => t.id === results.tab)?.label} Results
              </h2>

              {results.tab === "speakers" && <SpeakersResults data={results.data} />}
              {results.tab === "steg" && <StegResults data={results.data} />}
              {results.tab === "threats" && <ThreatsResults data={results.data} />}
              {results.tab === "enhance" && <EnhanceResults data={results.data} />}
            </motion.div>
          )}
        </div>
      )}
    </motion.div>
  );
}

function ForensicsResults({ data }: { data: any }) {
  const raw = data.tampering_probability ?? data.overall_score ?? 0;
  // Backend returns 0-1 float, convert to 0-100 percentage
  const pct = raw <= 1 ? Math.round(raw * 100) : Math.round(raw);
  const verdict = data.verdict || (pct > 60 ? "Suspicious" : pct > 30 ? "Warning" : "Clean");
  const icon = pct > 60 ? "🚨" : pct > 30 ? "⚠️" : "✅";

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="text-4xl mb-2">{icon}</div>
        <div className="text-xl font-bold">{verdict}</div>
        <div className="text-apple-gray text-sm">
          Tampering Probability: {pct}%
        </div>
        <div className="w-full h-2 rounded-full bg-white/10 mt-3 overflow-hidden">
          <div
            className={`h-full rounded-full ${pct > 60 ? "bg-red-500" : pct > 30 ? "bg-yellow-500" : "bg-green-500"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Detailed sub-analyses */}
      {data.analyses && (
        <div className="space-y-3">
          {Object.entries(data.analyses).map(([key, val]: [string, any]) => {
            const subScore = val.splice_score ?? val.enf_anomaly_score ?? val.recompression_score ?? val.inconsistency_score ?? val.anomaly_score ?? 0;
            const subPct = subScore <= 1 ? Math.round(subScore * 100) : Math.round(subScore);
            const method = val.method || key.replace(/_/g, " ");
            return (
              <div key={key} className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-semibold text-apple-white uppercase">
                    {key.replace(/_/g, " ")}
                  </div>
                  <span className={`text-xs font-bold ${subPct > 60 ? "text-red-400" : subPct > 30 ? "text-yellow-400" : "text-green-400"}`}>
                    {subPct}%
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden mb-2">
                  <div
                    className={`h-full rounded-full ${subPct > 60 ? "bg-red-500" : subPct > 30 ? "bg-yellow-500" : "bg-green-500"}`}
                    style={{ width: `${subPct}%` }}
                  />
                </div>
                <div className="text-[10px] text-apple-gray">{method}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Duration */}
      {data.duration && (
        <div className="text-center text-xs text-apple-gray">Audio duration: {data.duration}s</div>
      )}
    </div>
  );
}

function SpeakersResults({ data }: { data: any }) {
  const speakers = data.speakers || data.segments || [];
  const count = data.speaker_count ?? data.num_speakers ?? speakers.length;
  return (
    <div className="space-y-4">
      <div className="text-center">
        <div className="text-4xl font-bold text-gradient">{count}</div>
        <div className="text-apple-gray text-sm">Speakers Detected</div>
      </div>
      {data.timeline && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-apple-gray">Timeline</h3>
          {(data.timeline || []).map((seg: any, i: number) => (
            <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-white/[0.03]">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: `hsl(${(seg.speaker || i) * 90}, 70%, 60%)` }}
              />
              <span className="text-xs text-apple-gray">
                {seg.start?.toFixed(1)}s - {seg.end?.toFixed(1)}s
              </span>
              <span className="text-sm font-medium">Speaker {seg.speaker ?? i + 1}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StegResults({ data }: { data: any }) {
  const raw = data.steganography_probability ?? data.overall_score ?? 0;
  const pct = raw <= 1 ? Math.round(raw * 100) : Math.round(raw);
  const verdict = data.verdict || (pct > 60 ? "Suspicious" : pct > 30 ? "Warning" : "Clean");
  const icon = pct > 60 ? "🚨" : pct > 30 ? "⚠️" : "✅";

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="text-4xl mb-2">{icon}</div>
        <div className="text-xl font-bold">{verdict}</div>
        <div className="text-apple-gray text-sm">
          Steganography Probability: {pct}%
        </div>
        <div className="w-full h-2 rounded-full bg-white/10 mt-3 overflow-hidden">
          <div
            className={`h-full rounded-full ${pct > 60 ? "bg-red-500" : pct > 30 ? "bg-yellow-500" : "bg-green-500"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      {data.analyses && (
        <div className="space-y-3">
          {Object.entries(data.analyses).map(([key, val]: [string, any]) => {
            const subScore = val.lsb_score ?? val.phase_score ?? val.spectral_score ?? val.entropy_score ?? 0;
            const subPct = subScore <= 1 ? Math.round(subScore * 100) : Math.round(subScore);
            const method = val.method || key.replace(/_/g, " ");
            return (
              <div key={key} className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-semibold text-apple-white uppercase">
                    {key.replace(/_/g, " ")}
                  </div>
                  <span className={`text-xs font-bold ${subPct > 60 ? "text-red-400" : subPct > 30 ? "text-yellow-400" : "text-green-400"}`}>
                    {subPct}%
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden mb-2">
                  <div
                    className={`h-full rounded-full ${subPct > 60 ? "bg-red-500" : subPct > 30 ? "bg-yellow-500" : "bg-green-500"}`}
                    style={{ width: `${subPct}%` }}
                  />
                </div>
                <div className="text-[10px] text-apple-gray">{method}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ThreatsResults({ data }: { data: any }) {
  const events = data.events || data.threats || [];
  const level = data.threat_level || "CLEAR";
  const icons: Record<string, string> = {
    CLEAR: "✅",
    MEDIUM: "⚠️",
    HIGH: "🔶",
    CRITICAL: "🚨",
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <div className="text-4xl mb-2">{icons[level] || "✅"}</div>
        <div className="text-xl font-bold">{level}</div>
        <div className="text-apple-gray text-sm">
          {events.length} event(s) detected
        </div>
      </div>
      {events.length > 0 && (
        <div className="space-y-2">
          {events.map((ev: any, i: number) => (
            <div key={i} className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">{ev.type || ev.event_type}</div>
                <div className="text-xs text-apple-gray">
                  {ev.timestamp?.toFixed(1)}s • Confidence: {(ev.confidence * 100).toFixed(0)}%
                </div>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                ev.severity === "high" ? "bg-red-500/10 text-red-400" : "bg-yellow-500/10 text-yellow-400"
              }`}>
                {ev.severity}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EnhanceResults({ data }: { data: any }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4 text-center">
        <div className="p-4 rounded-xl bg-white/[0.03]">
          <div className="text-xs text-apple-gray mb-1">Before SNR</div>
          <div className="text-lg font-bold">{data.before_snr?.toFixed(1) ?? "—"} dB</div>
        </div>
        <div className="p-4 rounded-xl bg-green-500/5 border border-green-500/10">
          <div className="text-xs text-apple-gray mb-1">After SNR</div>
          <div className="text-lg font-bold text-green-400">
            {data.after_snr?.toFixed(1) ?? "—"} dB
          </div>
        </div>
        <div className="p-4 rounded-xl bg-white/[0.03]">
          <div className="text-xs text-apple-gray mb-1">Improvement</div>
          <div className="text-lg font-bold text-gradient">
            +{data.improvement?.toFixed(1) ?? "—"} dB
          </div>
        </div>
      </div>
      {data.enhanced_audio_base64 && (
        <div className="text-center">
          <button
            onClick={() => {
              const byteChars = atob(data.enhanced_audio_base64);
              const byteNums = new Array(byteChars.length);
              for (let i = 0; i < byteChars.length; i++) byteNums[i] = byteChars.charCodeAt(i);
              const blob = new Blob([new Uint8Array(byteNums)], { type: "audio/wav" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "enhanced_audio.wav";
              a.click();
            }}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-accent-blue to-accent-purple text-white text-sm font-semibold"
          >
            ⬇️ Download Enhanced Audio
          </button>
        </div>
      )}
    </div>
  );
}
