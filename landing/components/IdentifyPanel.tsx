"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { useToast } from "./shared";

// ─── Waveform Drawing ───
function drawWaveform(canvas: HTMLCanvasElement, audioBuffer: AudioBuffer) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const data = audioBuffer.getChannelData(0);
  const width = canvas.parentElement?.clientWidth || 600;
  const height = 120;
  canvas.width = width;
  canvas.height = height;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "rgba(6, 6, 11, 0.5)";
  ctx.fillRect(0, 0, width, height);

  // Center line
  ctx.strokeStyle = "rgba(255,255,255,0.05)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, height / 2);
  ctx.lineTo(width, height / 2);
  ctx.stroke();

  // Waveform bars
  const step = Math.ceil(data.length / width);
  const centerY = height / 2;
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "#60a5fa");
  gradient.addColorStop(0.5, "#a855f7");
  gradient.addColorStop(1, "#60a5fa");
  ctx.fillStyle = gradient;

  for (let i = 0; i < width; i++) {
    let min = 1.0, max = -1.0;
    for (let j = 0; j < step; j++) {
      const d = data[i * step + j];
      if (d < min) min = d;
      if (d > max) max = d;
    }
    const y1 = centerY + min * centerY * 0.9;
    const y2 = centerY + max * centerY * 0.9;
    ctx.fillRect(i, y1, 1, y2 - y1 || 1);
  }
}

// ─── Spectrogram Drawing ───
function drawSpectrogram(canvas: HTMLCanvasElement, audioBuffer: AudioBuffer) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const data = audioBuffer.getChannelData(0);
  const width = canvas.parentElement?.clientWidth || 600;
  const height = 100;
  canvas.width = width;
  canvas.height = height;

  const fftSize = 256;
  const numBins = fftSize / 2;
  const hopSize = Math.max(1, Math.floor(data.length / width));
  const colors = genColors();

  for (let x = 0; x < width; x++) {
    const start = x * hopSize;
    const segment = data.slice(start, start + fftSize);
    if (segment.length < fftSize) break;
    const mags = computeFFT(segment, fftSize);
    for (let y = 0; y < height; y++) {
      const binIdx = Math.floor((y / height) * numBins);
      const mag = mags[binIdx] || 0;
      const ci = Math.min(Math.floor(mag * 10), colors.length - 1);
      ctx.fillStyle = colors[Math.max(0, ci)];
      ctx.fillRect(x, height - y - 1, 1, 1);
    }
  }
}

function computeFFT(seg: Float32Array, N: number): number[] {
  const mags: number[] = [];
  for (let k = 0; k < N / 2; k++) {
    let re = 0, im = 0;
    for (let n = 0; n < N; n++) {
      const hann = 0.5 * (1 - Math.cos((2 * Math.PI * n) / N));
      const angle = (2 * Math.PI * k * n) / N;
      re += seg[n] * hann * Math.cos(angle);
      im -= seg[n] * hann * Math.sin(angle);
    }
    mags.push(Math.sqrt(re * re + im * im) / N);
  }
  return mags;
}

function genColors(): string[] {
  const c: string[] = [];
  for (let i = 0; i < 256; i++) {
    const t = i / 255;
    let r: number, g: number, b: number;
    if (t < 0.25) { r = 10; g = 10; b = Math.floor(30 + t * 4 * 100); }
    else if (t < 0.5) { r = Math.floor((t - 0.25) * 4 * 124); g = 20; b = 130; }
    else if (t < 0.75) { r = 124; g = Math.floor(58 + (t - 0.5) * 4 * 156); b = Math.floor(237 - (t - 0.5) * 4 * 100); }
    else { r = Math.floor(124 + (t - 0.75) * 4 * 131); g = 214; b = Math.floor(137 + (t - 0.75) * 4 * 100); }
    c.push(`rgb(${r},${g},${b})`);
  }
  return c;
}

// ─── Main Component ───
export default function IdentifyPanel() {
  const { showToast } = useToast();
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [hasWaveform, setHasWaveform] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const waveformRef = useRef<HTMLCanvasElement>(null);
  const spectrogramRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Decode audio and draw visualizations
  const decodeAndDraw = useCallback((blob: Blob) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioCtx.decodeAudioData(e.target?.result as ArrayBuffer, (buffer) => {
        if (waveformRef.current) drawWaveform(waveformRef.current, buffer);
        if (spectrogramRef.current) drawSpectrogram(spectrogramRef.current, buffer);
        setHasWaveform(true);
        audioCtx.close();
      });
    };
    reader.readAsArrayBuffer(blob);
  }, []);

  const handleFile = useCallback((file: File) => {
    setAudioFile(file);
    setAudioBlob(file);
    setResults(null);
    setHasWaveform(false);
    // small delay so canvas is mounted
    setTimeout(() => decodeAndDraw(file), 100);
  }, [decodeAndDraw]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file?.type.startsWith("audio/")) handleFile(file);
    },
    [handleFile]
  );

  const convertBlobToWav = async (blob: Blob): Promise<Blob> => {
    const arrayBuf = await blob.arrayBuffer();
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuf);
    // Downsample to 16kHz mono WAV
    const sampleRate = 16000;
    const offlineCtx = new OfflineAudioContext(1, audioBuffer.duration * sampleRate, sampleRate);
    const source = offlineCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(offlineCtx.destination);
    source.start(0);
    const rendered = await offlineCtx.startRendering();
    const pcmData = rendered.getChannelData(0);
    // Encode as WAV
    const wavBuffer = new ArrayBuffer(44 + pcmData.length * 2);
    const view = new DataView(wavBuffer);
    const writeStr = (o: number, s: string) => { for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i)); };
    writeStr(0, 'RIFF');
    view.setUint32(4, 36 + pcmData.length * 2, true);
    writeStr(8, 'WAVE');
    writeStr(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeStr(36, 'data');
    view.setUint32(40, pcmData.length * 2, true);
    for (let i = 0; i < pcmData.length; i++) {
      const s = Math.max(-1, Math.min(1, pcmData[i]));
      view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
    audioCtx.close();
    return new Blob([wavBuffer], { type: 'audio/wav' });
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 16000 }
      });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => chunksRef.current.push(e.data);
      mr.onstop = async () => {
        const webmBlob = new Blob(chunksRef.current, { type: "audio/webm" });
        stream.getTracks().forEach((t) => t.stop());
        try {
          // Convert WebM to WAV for reliable backend decoding
          const wavBlob = await convertBlobToWav(webmBlob);
          const file = new File([wavBlob], "microphone_recording.wav", { type: "audio/wav" });
          setAudioBlob(wavBlob);
          setAudioFile(file);
          setHasWaveform(false);
          setTimeout(() => decodeAndDraw(wavBlob), 100);
        } catch {
          // Fallback: use WebM directly
          const file = new File([webmBlob], "microphone_recording.webm", { type: "audio/webm" });
          setAudioBlob(webmBlob);
          setAudioFile(file);
          setHasWaveform(false);
          setTimeout(() => decodeAndDraw(webmBlob), 100);
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

  const clearAudio = () => {
    setAudioFile(null);
    setAudioBlob(null);
    setResults(null);
    setHasWaveform(false);
  };

  const identify = async () => {
    if (!audioBlob) return;
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", audioBlob);
      const endpoint = audioFile?.name.includes("microphone")
        ? "/api/classify/record"
        : "/api/classify/upload";
      const res = await fetch(endpoint, { method: "POST", body: fd });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      setResults(data);
      showToast("Sound identified successfully!", "success");
    } catch (err: any) {
      showToast(`Classification failed: ${err.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const predictions = results?.predictions || [];
  const top = predictions[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-[1200px] mx-auto"
    >
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-3">
          🎯 Identify Sound
        </h1>
        <p className="text-apple-gray text-lg">
          Upload an audio file or record live to instantly classify
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: Input */}
        <div className="space-y-6">
          {/* Upload */}
          <div
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className="glass-card p-10 text-center cursor-pointer hover:border-accent-blue/30 transition-all group"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
            <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">📁</div>
            <div className="font-semibold text-apple-white mb-1">
              Drop audio file here or click to browse
            </div>
            <div className="text-sm text-apple-gray mb-3">
              Supports all major audio formats
            </div>
            <div className="flex gap-2 justify-center flex-wrap">
              {["WAV", "MP3", "OGG", "FLAC", "WEBM"].map((f) => (
                <span key={f} className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-xs text-apple-gray">
                  {f}
                </span>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="text-center text-apple-gray text-sm">or record live</div>

          {/* Record */}
          <div className="flex flex-col items-center gap-3">
            <button
              onClick={isRecording ? stopRecording : startRecording}
              className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl transition-all ${
                isRecording
                  ? "bg-red-500/20 border-2 border-red-500 animate-pulse"
                  : "bg-white/5 border-2 border-white/10 hover:border-accent-blue/40"
              }`}
            >
              {isRecording ? "⏹️" : "🎙️"}
            </button>
            <span className="text-sm text-apple-gray">
              {isRecording
                ? `Recording... ${String(Math.floor(recordSeconds / 60)).padStart(2, "0")}:${String(recordSeconds % 60).padStart(2, "0")}`
                : "Click to record"}
            </span>
          </div>

          {/* Preview + Waveform */}
          {audioFile && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card p-5 space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xl">🎵</span>
                  <div>
                    <div className="text-sm font-medium text-apple-white">{audioFile.name}</div>
                    <div className="text-xs text-apple-gray">
                      {(audioFile.size / 1024).toFixed(1)} KB • {audioFile.type || "audio"}
                    </div>
                  </div>
                </div>
                <button onClick={clearAudio} className="text-xs text-apple-gray hover:text-red-400 transition-colors">
                  ✕ Clear
                </button>
              </div>

              {/* ═══ WAVEFORM ═══ */}
              <div className="rounded-xl overflow-hidden border border-white/[0.06]">
                <div className="px-3 py-1.5 bg-white/[0.03] border-b border-white/[0.06] flex items-center gap-2">
                  <span className="text-xs">〰️</span>
                  <span className="text-[10px] font-semibold text-apple-gray uppercase tracking-wider">Waveform</span>
                </div>
                <div className="bg-black/40">
                  <canvas ref={waveformRef} className="w-full block" style={{ height: "120px" }} />
                </div>
              </div>

              {/* ═══ SPECTROGRAM ═══ */}
              <div className="rounded-xl overflow-hidden border border-white/[0.06]">
                <div className="px-3 py-1.5 bg-white/[0.03] border-b border-white/[0.06] flex items-center gap-2">
                  <span className="text-xs">🌈</span>
                  <span className="text-[10px] font-semibold text-apple-gray uppercase tracking-wider">Spectrogram</span>
                </div>
                <div className="bg-black/40">
                  <canvas ref={spectrogramRef} className="w-full block" style={{ height: "100px" }} />
                </div>
              </div>

              <button
                onClick={identify}
                disabled={loading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-accent-blue to-accent-purple text-white font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Analyzing...
                  </span>
                ) : (
                  "🎯 Identify Sound"
                )}
              </button>
            </motion.div>
          )}
        </div>

        {/* Right: Results */}
        <div>
          {results && top ? (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="glass-card p-8"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold">Results</h2>
                <span className="text-xs px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-400">
                  ✓ Identified
                </span>
              </div>

              {/* Top prediction */}
              <div className="text-center mb-8">
                <div className="text-5xl mb-3">{getIcon(top.class)}</div>
                <div className="text-2xl font-bold text-apple-white mb-1">{top.class}</div>
                <div className="text-sm text-apple-gray mb-4">
                  via {top.model || results.model_used}
                </div>

                {/* Confidence circle */}
                <div className="inline-flex flex-col items-center gap-2">
                  <div className="relative w-28 h-28">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 110 110">
                      <circle cx="55" cy="55" r="48" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
                      <circle
                        cx="55" cy="55" r="48" fill="none"
                        stroke="url(#confGrad)"
                        strokeWidth="6"
                        strokeLinecap="round"
                        strokeDasharray={2 * Math.PI * 48}
                        strokeDashoffset={2 * Math.PI * 48 * (1 - top.confidence)}
                        className="transition-all duration-1000"
                      />
                      <defs>
                        <linearGradient id="confGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#60a5fa" />
                          <stop offset="100%" stopColor="#a855f7" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-2xl font-bold text-gradient">
                        {Math.round(top.confidence * 100)}%
                      </span>
                    </div>
                  </div>
                  <span className="text-xs text-apple-gray">
                    {top.confidence > 0.7 ? "High Confidence" : top.confidence > 0.4 ? "Medium Confidence" : "Low Confidence"}
                  </span>
                </div>
              </div>

              {/* All predictions */}
              <h3 className="text-sm font-semibold text-apple-gray mb-3">All Predictions</h3>
              <div className="space-y-2">
                {predictions.slice(0, 8).map((p: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 py-2 px-3 rounded-lg bg-white/[0.02]">
                    <span className="text-xs font-bold text-apple-gray w-5">{i + 1}</span>
                    <span className="text-sm flex-1 text-apple-white">{p.class}</span>
                    <div className="w-20 h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-accent-blue/80 to-accent-purple/80 transition-all duration-500"
                        style={{ width: `${p.confidence * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-apple-gray w-12 text-right">
                      {(p.confidence * 100).toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          ) : (
            <div className="glass-card p-12 text-center">
              <div className="text-4xl mb-4">🎧</div>
              <div className="text-lg font-semibold text-apple-white mb-1">
                Ready to identify
              </div>
              <div className="text-sm text-apple-gray">
                Upload an audio file or record live to get started
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function getIcon(cls: string): string {
  const l = cls.toLowerCase();
  if (l.includes("bird") || l.includes("crow") || l.includes("sparrow")) return "🐦";
  if (l.includes("dog") || l.includes("bark")) return "🐕";
  if (l.includes("cat") || l.includes("meow")) return "🐱";
  if (l.includes("car") || l.includes("engine") || l.includes("vehicle")) return "🚗";
  if (l.includes("truck")) return "🚛";
  if (l.includes("train")) return "🚂";
  if (l.includes("airplane") || l.includes("aircraft")) return "✈️";
  if (l.includes("helicopter")) return "🚁";
  if (l.includes("rain") || l.includes("drizzle")) return "🌧️";
  if (l.includes("thunder") || l.includes("storm")) return "⛈️";
  if (l.includes("wind")) return "💨";
  if (l.includes("music") || l.includes("piano") || l.includes("guitar")) return "🎵";
  if (l.includes("drum")) return "🥁";
  if (l.includes("speech") || l.includes("talk") || l.includes("voice")) return "🗣️";
  if (l.includes("laugh")) return "😄";
  if (l.includes("clap") || l.includes("applause")) return "👏";
  if (l.includes("knock")) return "🚪";
  if (l.includes("phone") || l.includes("ring")) return "📱";
  if (l.includes("siren")) return "🚨";
  if (l.includes("water") || l.includes("ocean") || l.includes("wave")) return "🌊";
  if (l.includes("forest") || l.includes("nature")) return "🌿";
  if (l.includes("fire") || l.includes("explosion")) return "🔥";
  if (l.includes("horn")) return "📯";
  return "🔊";
}
