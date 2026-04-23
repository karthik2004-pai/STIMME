"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { useToast } from "./shared";

interface Profile {
  name: string;
  enrolled_at: string;
  num_samples: number;
}

interface MatchResult {
  name: string;
  similarity: number;
  match_percentage: number;
  is_match: boolean;
  num_samples: number;
}

export default function VoiceMatchPanel() {
  const { showToast } = useToast();
  const [mode, setMode] = useState<"enroll" | "verify">("verify");
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [enrollName, setEnrollName] = useState("");
  const [loading, setLoading] = useState(false);
  const [verifyResults, setVerifyResults] = useState<{
    match_found: boolean;
    best_match: MatchResult | null;
    results: MatchResult[];
    message: string;
  } | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    try {
      const res = await fetch("/api/voice/profiles");
      const data = await res.json();
      setProfiles(data.profiles || []);
    } catch {
      /* ignore */
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 16000 },
      });
      const mr = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
      chunksRef.current = [];
      mr.ondataavailable = (e) => chunksRef.current.push(e.data);
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        stream.getTracks().forEach((t) => t.stop());
        if (mode === "enroll") {
          enrollVoice(blob);
        } else {
          verifyVoice(blob);
        }
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setIsRecording(true);
      setRecordSeconds(0);
      timerRef.current = setInterval(() => setRecordSeconds((s) => s + 1), 1000);
    } catch {
      showToast("Microphone access denied", "error");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const enrollVoice = async (blob: Blob) => {
    if (!enrollName.trim()) {
      showToast("Enter a name for this voice profile", "error");
      return;
    }
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", blob, "voice.webm");
      fd.append("name", enrollName.trim());
      const res = await fetch("/api/voice/enroll", { method: "POST", body: fd });
      const data = await res.json();
      if (data.success) {
        showToast(`✅ Voice enrolled: ${enrollName}`, "success");
        setEnrollName("");
        loadProfiles();
      } else {
        showToast(data.error || "Enrollment failed", "error");
      }
    } catch (err: any) {
      showToast(`Enrollment failed: ${err.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const verifyVoice = async (blob: Blob) => {
    setLoading(true);
    setVerifyResults(null);
    try {
      const fd = new FormData();
      fd.append("file", blob, "verify.webm");
      const res = await fetch("/api/voice/verify", { method: "POST", body: fd });
      const data = await res.json();
      setVerifyResults(data);
      if (data.match_found) {
        showToast(`✅ Match found: ${data.best_match?.name}`, "success");
      } else {
        showToast("No match found in enrolled profiles", "info");
      }
    } catch (err: any) {
      showToast(`Verification failed: ${err.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (mode === "enroll") {
      if (!enrollName.trim()) {
        showToast("Enter a name for this voice profile", "error");
        return;
      }
      enrollVoice(file);
    } else {
      verifyVoice(file);
    }
  };

  const deleteProfile = async (name: string) => {
    try {
      await fetch(`/api/voice/profiles/${encodeURIComponent(name)}`, { method: "DELETE" });
      showToast(`Profile "${name}" deleted`, "info");
      loadProfiles();
    } catch {
      showToast("Delete failed", "error");
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-[1200px] mx-auto">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-3">🔐 Voice Match</h1>
        <p className="text-apple-gray text-lg">Speaker verification — enroll voices and verify identity</p>
      </div>

      {/* Mode Toggle */}
      <div className="flex justify-center gap-2 mb-8">
        <button
          onClick={() => { setMode("verify"); setVerifyResults(null); }}
          className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            mode === "verify"
              ? "bg-gradient-to-r from-accent-blue to-accent-purple text-white"
              : "bg-white/5 border border-white/10 text-apple-gray hover:text-white"
          }`}
        >
          🔍 Verify Identity
        </button>
        <button
          onClick={() => { setMode("enroll"); setVerifyResults(null); }}
          className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            mode === "enroll"
              ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white"
              : "bg-white/5 border border-white/10 text-apple-gray hover:text-white"
          }`}
        >
          ➕ Enroll Voice
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Input */}
        <div className="lg:col-span-2 space-y-6">
          {/* Enroll Name Input */}
          {mode === "enroll" && (
            <div className="glass-card p-4">
              <label className="text-xs font-bold text-apple-gray uppercase mb-2 block">Person Name</label>
              <input
                value={enrollName}
                onChange={(e) => setEnrollName(e.target.value)}
                placeholder="e.g., John Doe, Suspect Alpha..."
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-apple-gray focus:outline-none focus:border-accent-blue/40"
              />
            </div>
          )}

          {/* Recording / Upload */}
          <div className="glass-card p-8 text-center">
            <div className="text-5xl mb-4">{mode === "enroll" ? "🎤" : "🔐"}</div>
            <div className="text-lg font-semibold text-apple-white mb-2">
              {mode === "enroll" ? "Record Voice to Enroll" : "Record Voice to Verify"}
            </div>
            <p className="text-sm text-apple-gray mb-6">
              {mode === "enroll"
                ? "Record at least 3 seconds of clear speech for accurate enrollment"
                : "Record speech to check against enrolled voice profiles"}
            </p>

            <div className="flex flex-wrap gap-3 justify-center">
              {isRecording ? (
                <button
                  onClick={stopRecording}
                  className="px-8 py-3 rounded-xl bg-red-500/20 border-2 border-red-500 text-red-400 font-bold text-sm animate-pulse"
                >
                  ⏹ Stop Recording ({recordSeconds}s)
                </button>
              ) : (
                <>
                  <button
                    onClick={startRecording}
                    disabled={loading || (mode === "enroll" && !enrollName.trim())}
                    className="px-8 py-3 rounded-xl bg-gradient-to-r from-accent-blue to-accent-purple text-white font-bold text-sm hover:scale-105 transition-all disabled:opacity-40"
                  >
                    🎙️ Start Recording
                  </button>
                  <button
                    onClick={() => fileRef.current?.click()}
                    disabled={loading || (mode === "enroll" && !enrollName.trim())}
                    className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-apple-gray text-sm font-medium hover:text-white disabled:opacity-40"
                  >
                    📁 Upload Audio File
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="audio/*"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                  />
                </>
              )}
            </div>

            {loading && (
              <div className="mt-6">
                <div className="inline-block w-6 h-6 border-2 border-accent-blue/40 border-t-accent-blue rounded-full animate-spin" />
                <div className="text-xs text-apple-gray mt-2">
                  {mode === "enroll" ? "Enrolling voice profile..." : "Analyzing & matching voice..."}
                </div>
              </div>
            )}
          </div>

          {/* Verification Results */}
          {verifyResults && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              {/* Main Result */}
              <div
                className={`glass-card p-8 text-center border-2 ${
                  verifyResults.match_found
                    ? "border-green-500/30 bg-green-500/5"
                    : "border-yellow-500/30 bg-yellow-500/5"
                }`}
              >
                <div className="text-5xl mb-3">{verifyResults.match_found ? "✅" : "❓"}</div>
                <div className="text-2xl font-bold mb-2">
                  {verifyResults.match_found
                    ? `MATCH: ${verifyResults.best_match?.name}`
                    : "NO MATCH FOUND"}
                </div>
                {verifyResults.best_match && (
                  <div className="space-y-3 mt-4">
                    <div className="text-4xl font-black text-gradient">
                      {verifyResults.best_match.match_percentage}%
                    </div>
                    <div className="text-sm text-apple-gray">Confidence Score</div>
                    <div className="w-full max-w-xs mx-auto h-3 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-1000 ${
                          verifyResults.best_match.match_percentage > 70
                            ? "bg-green-500"
                            : verifyResults.best_match.match_percentage > 50
                            ? "bg-yellow-500"
                            : "bg-red-500"
                        }`}
                        style={{ width: `${verifyResults.best_match.match_percentage}%` }}
                      />
                    </div>
                    <div className="text-xs text-apple-gray">
                      {verifyResults.best_match.match_percentage > 70
                        ? "🟢 Strong match — very likely the same person"
                        : verifyResults.best_match.match_percentage > 50
                        ? "🟡 Partial match — could be the same person"
                        : "🔴 Weak match — likely different people"}
                    </div>
                  </div>
                )}
              </div>

              {/* All Matches */}
              {verifyResults.results.length > 0 && (
                <div className="glass-card p-6">
                  <h3 className="text-sm font-bold text-apple-gray uppercase mb-4">All Comparisons</h3>
                  <div className="space-y-3">
                    {verifyResults.results.map((r, i) => (
                      <div key={r.name} className="flex items-center gap-4 p-3 rounded-xl bg-white/[0.03]">
                        <div className="text-lg font-bold text-apple-gray w-6 text-center">#{i + 1}</div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-apple-white">{r.name}</span>
                            {r.is_match && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 font-bold">MATCH</span>
                            )}
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden mt-1">
                            <div
                              className={`h-full rounded-full ${
                                r.match_percentage > 70 ? "bg-green-500" : r.match_percentage > 50 ? "bg-yellow-500" : "bg-red-500"
                              }`}
                              style={{ width: `${r.match_percentage}%` }}
                            />
                          </div>
                        </div>
                        <div className={`text-lg font-bold ${r.match_percentage > 70 ? "text-green-400" : r.match_percentage > 50 ? "text-yellow-400" : "text-apple-gray"}`}>
                          {r.match_percentage}%
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </div>

        {/* Right: Enrolled Profiles */}
        <div className="space-y-4">
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold text-apple-gray uppercase">Enrolled Profiles</h3>
              <span className="text-xs text-accent-blue font-bold">{profiles.length}</span>
            </div>
            {profiles.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-3xl mb-2">👤</div>
                <div className="text-sm text-apple-gray">No profiles enrolled yet</div>
                <div className="text-xs text-apple-gray mt-1">Switch to &quot;Enroll Voice&quot; to add one</div>
              </div>
            ) : (
              <div className="space-y-2">
                {profiles.map((p) => (
                  <div key={p.name} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                    <div className="w-8 h-8 rounded-full bg-accent-blue/20 flex items-center justify-center text-xs font-bold text-accent-blue">
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-apple-white truncate">{p.name}</div>
                      <div className="text-[10px] text-apple-gray">{p.num_samples} sample(s)</div>
                    </div>
                    <button
                      onClick={() => deleteProfile(p.name)}
                      className="text-xs text-apple-gray hover:text-red-400 shrink-0"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* How It Works */}
          <div className="glass-card p-5">
            <h3 className="text-xs font-bold text-apple-gray uppercase mb-3">How It Works</h3>
            <div className="space-y-3 text-xs text-apple-gray">
              <div className="flex gap-2">
                <span className="text-accent-blue shrink-0">1.</span>
                <span><strong className="text-apple-white">Enroll</strong> — Record a known person&apos;s voice to create their profile</span>
              </div>
              <div className="flex gap-2">
                <span className="text-accent-blue shrink-0">2.</span>
                <span><strong className="text-apple-white">Verify</strong> — Record an unknown voice to check against all profiles</span>
              </div>
              <div className="flex gap-2">
                <span className="text-accent-blue shrink-0">3.</span>
                <span><strong className="text-apple-white">Match</strong> — System shows confidence % for each enrolled person</span>
              </div>
              <div className="mt-3 p-2 rounded-lg bg-accent-blue/5 border border-accent-blue/10">
                <span className="text-accent-blue font-semibold">💡 Tip:</span> Enroll multiple samples of the same person for higher accuracy
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
