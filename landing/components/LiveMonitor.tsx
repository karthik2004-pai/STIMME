"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useToast } from "./shared";

// ─── Live Monitor: Continuous real-time ambient sound classification ───
export default function LiveMonitor() {
  const { showToast } = useToast();
  const [isActive, setIsActive] = useState(false);
  const [detections, setDetections] = useState<any[]>([]);
  const [currentSound, setCurrentSound] = useState<string | null>(null);
  const [confidence, setConfidence] = useState(0);
  const [volume, setVolume] = useState(0);
  const streamRef = useRef<MediaStream | null>(null);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const drawLiveWaveform = useCallback(() => {
    if (!analyserRef.current || !canvasRef.current) return;
    const analyser = analyserRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const bufLen = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufLen);

    const draw = () => {
      animRef.current = requestAnimationFrame(draw);
      analyser.getByteTimeDomainData(dataArray);
      const w = canvas.width = canvas.parentElement?.clientWidth || 600;
      const h = canvas.height = 80;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "rgba(0,0,0,0.3)";
      ctx.fillRect(0, 0, w, h);

      const gradient = ctx.createLinearGradient(0, 0, w, 0);
      gradient.addColorStop(0, "#60a5fa");
      gradient.addColorStop(0.5, "#a855f7");
      gradient.addColorStop(1, "#06b6d4");
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 2;
      ctx.beginPath();
      const sliceWidth = w / bufLen;
      let x = 0;
      for (let i = 0; i < bufLen; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * h) / 2;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        x += sliceWidth;
      }
      ctx.lineTo(w, h / 2);
      ctx.stroke();

      // Volume calc
      let sum = 0;
      for (let i = 0; i < bufLen; i++) {
        const v = (dataArray[i] - 128) / 128;
        sum += v * v;
      }
      setVolume(Math.sqrt(sum / bufLen) * 100);
    };
    draw();
  }, []);

  const convertToWav = useCallback(async (blob: Blob): Promise<Blob> => {
    try {
      const arrayBuf = await blob.arrayBuffer();
      const audioCtx = new AudioContext();
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuf);
      const sr = 16000;
      const offlineCtx = new OfflineAudioContext(1, audioBuffer.duration * sr, sr);
      const source = offlineCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(offlineCtx.destination);
      source.start(0);
      const rendered = await offlineCtx.startRendering();
      const pcm = rendered.getChannelData(0);
      const buf = new ArrayBuffer(44 + pcm.length * 2);
      const v = new DataView(buf);
      const w = (o: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
      w(0, 'RIFF'); v.setUint32(4, 36 + pcm.length * 2, true);
      w(8, 'WAVE'); w(12, 'fmt '); v.setUint32(16, 16, true);
      v.setUint16(20, 1, true); v.setUint16(22, 1, true);
      v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true);
      v.setUint16(32, 2, true); v.setUint16(34, 16, true);
      w(36, 'data'); v.setUint32(40, pcm.length * 2, true);
      for (let i = 0; i < pcm.length; i++) {
        const s = Math.max(-1, Math.min(1, pcm[i]));
        v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
      }
      audioCtx.close();
      return new Blob([buf], { type: 'audio/wav' });
    } catch {
      return blob; // fallback to original
    }
  }, []);

  const classifyChunk = useCallback(async (blob: Blob) => {
    try {
      const wavBlob = await convertToWav(blob);
      const fd = new FormData();
      fd.append("file", wavBlob, "live_chunk.wav");
      const res = await fetch("/api/classify/record", { method: "POST", body: fd });
      if (!res.ok) return;
      const data = await res.json();
      const preds = data.predictions || [];
      if (preds.length > 0 && preds[0].confidence > 0.15) {
        const top = preds[0];
        setCurrentSound(top.class);
        setConfidence(Math.round(top.confidence * 100));
        setDetections((prev) => [
          { class: top.class, confidence: top.confidence, time: new Date(), icon: getIcon(top.class) },
          ...prev.slice(0, 49),
        ]);
      }
    } catch { /* silent */ }
  }, [convertToWav]);

  const startMonitoring = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Setup analyser for live waveform
      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      analyserRef.current = analyser;

      setIsActive(true);
      drawLiveWaveform();

      // Record and classify every 3 seconds
      const recordChunk = () => {
        if (!streamRef.current) return;
        const mr = new MediaRecorder(streamRef.current);
        const chunks: Blob[] = [];
        mr.ondataavailable = (e) => chunks.push(e.data);
        mr.onstop = () => {
          const blob = new Blob(chunks, { type: "audio/webm" });
          classifyChunk(blob);
        };
        mr.start();
        setTimeout(() => { if (mr.state === "recording") mr.stop(); }, 3000);
      };

      recordChunk();
      intervalRef.current = setInterval(recordChunk, 3500);
      showToast("Live monitoring started!", "success");
    } catch {
      showToast("Microphone access denied", "error");
    }
  };

  const stopMonitoring = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (animRef.current) cancelAnimationFrame(animRef.current);
    setIsActive(false);
    showToast("Monitoring stopped", "info");
  };

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, []);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-[1200px] mx-auto">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-3">📡 Live Monitor</h1>
        <p className="text-apple-gray text-lg">Continuous real-time ambient sound classification</p>
      </div>

      {/* Control */}
      <div className="flex justify-center mb-8">
        <button
          onClick={isActive ? stopMonitoring : startMonitoring}
          className={`px-8 py-4 rounded-2xl text-sm font-bold transition-all ${
            isActive
              ? "bg-red-500/20 border-2 border-red-500 text-red-400 hover:bg-red-500/30"
              : "bg-gradient-to-r from-accent-blue to-accent-purple text-white hover:scale-105"
          }`}
        >
          {isActive ? "⏹ Stop Monitoring" : "📡 Start Live Monitor"}
        </button>
      </div>

      {isActive && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          {/* Live waveform */}
          <div className="glass-card overflow-hidden">
            <div className="px-4 py-2 bg-white/[0.03] border-b border-white/[0.06] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-xs font-semibold text-apple-gray uppercase tracking-wider">Live Audio Feed</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-apple-gray">Volume:</span>
                <div className="w-20 h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full rounded-full bg-green-400 transition-all duration-100" style={{ width: `${Math.min(volume * 3, 100)}%` }} />
                </div>
              </div>
            </div>
            <canvas ref={canvasRef} className="w-full block" style={{ height: "80px" }} />
          </div>

          {/* Current detection */}
          {currentSound && (
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="glass-card p-8 text-center">
              <div className="text-5xl mb-3">{getIcon(currentSound)}</div>
              <div className="text-3xl font-bold text-apple-white mb-2">{currentSound}</div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5">
                <div className="w-24 h-2 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-accent-blue to-accent-purple" style={{ width: `${confidence}%` }} />
                </div>
                <span className="text-sm font-bold text-gradient">{confidence}%</span>
              </div>
            </motion.div>
          )}

          {/* Detection log */}
          <div className="glass-card p-6">
            <h3 className="text-sm font-bold mb-4">Detection Log ({detections.length})</h3>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {detections.map((d, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-3 py-2 px-3 rounded-lg bg-white/[0.02]">
                  <span>{d.icon}</span>
                  <span className="text-sm font-medium flex-1">{d.class}</span>
                  <span className="text-xs text-apple-gray">{(d.confidence * 100).toFixed(0)}%</span>
                  <span className="text-xs text-apple-gray">{d.time.toLocaleTimeString()}</span>
                </motion.div>
              ))}
              {detections.length === 0 && <div className="text-center text-apple-gray text-sm py-4">Listening for sounds...</div>}
            </div>
          </div>
        </motion.div>
      )}

      {!isActive && (
        <div className="glass-card p-16 text-center">
          <div className="text-5xl mb-4">📡</div>
          <div className="text-xl font-semibold mb-2">Ready to Monitor</div>
          <div className="text-sm text-apple-gray max-w-md mx-auto">Start the live monitor to continuously classify ambient sounds in real-time. The AI analyzes 3-second audio chunks every 3.5 seconds.</div>
        </div>
      )}
    </motion.div>
  );
}

function getIcon(cls: string): string {
  const l = cls.toLowerCase();
  if (l.includes("bird") || l.includes("crow")) return "🐦";
  if (l.includes("dog") || l.includes("bark")) return "🐕";
  if (l.includes("cat") || l.includes("meow")) return "🐱";
  if (l.includes("car") || l.includes("engine")) return "🚗";
  if (l.includes("speech") || l.includes("talk") || l.includes("voice")) return "🗣️";
  if (l.includes("music") || l.includes("piano")) return "🎵";
  if (l.includes("rain")) return "🌧️";
  if (l.includes("siren")) return "🚨";
  if (l.includes("water") || l.includes("ocean")) return "🌊";
  return "🔊";
}
