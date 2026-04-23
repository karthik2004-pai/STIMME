"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useToast } from "./shared";

const BAND_NAMES = ["Sub-Bass", "Bass", "Low-Mid", "Mid", "Upper-Mid", "Presence", "Brilliance"];
const BAND_FREQS = ["20-60Hz", "60-250Hz", "250-500Hz", "500-2kHz", "2k-4kHz", "4k-6kHz", "6k-20kHz"];
const BAND_COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4", "#8b5cf6", "#ec4899"];
const BAND_RANGES = [[0, 2], [2, 8], [8, 16], [16, 32], [32, 48], [48, 64], [64, 128]];

export default function AnalyzePanel() {
  const { showToast } = useToast();
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [bands, setBands] = useState<number[]>(new Array(7).fill(0));
  const fileRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const fftCanvasRef = useRef<HTMLCanvasElement>(null);
  const waveCanvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number | null>(null);
  const sourceCreated = useRef(false);

  const handleFile = useCallback((file: File) => {
    // Cleanup previous audio context properly
    if (animRef.current) cancelAnimationFrame(animRef.current);
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
      analyserRef.current = null;
    }
    sourceCreated.current = false;
    setIsPlaying(false);
    setBands(new Array(7).fill(0));

    setAudioFile(file);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    const url = URL.createObjectURL(file);
    setAudioUrl(url);
  }, [audioUrl]);

  const setupAnalyser = () => {
    if (!audioRef.current || sourceCreated.current) return;
    const ctx = new AudioContext();
    const source = ctx.createMediaElementSource(audioRef.current);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    analyser.connect(ctx.destination);
    analyserRef.current = analyser;
    audioCtxRef.current = ctx;
    sourceCreated.current = true;
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    setupAnalyser();
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
      startVisualization();
    }
  };

  const startVisualization = () => {
    if (!analyserRef.current || !fftCanvasRef.current) return;
    const analyser = analyserRef.current;
    const bufLen = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufLen);
    const fftCanvas = fftCanvasRef.current;
    const waveCanvas = waveCanvasRef.current;

    const draw = () => {
      animRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      // FFT bars
      const fCtx = fftCanvas.getContext("2d");
      if (fCtx) {
        const w = fftCanvas.width = fftCanvas.parentElement?.clientWidth || 600;
        const h = fftCanvas.height = 200;
        fCtx.clearRect(0, 0, w, h);
        fCtx.fillStyle = "rgba(0,0,0,0.3)";
        fCtx.fillRect(0, 0, w, h);

        const barW = w / bufLen * 2;
        for (let i = 0; i < bufLen; i++) {
          const barH = (dataArray[i] / 255) * h * 0.9;
          const hue = (i / bufLen) * 250 + 200;
          fCtx.fillStyle = `hsl(${hue}, 80%, ${50 + (dataArray[i] / 255) * 30}%)`;
          fCtx.fillRect(i * barW, h - barH, barW - 1, barH);
        }
      }

      // Waveform
      if (waveCanvas) {
        const timeData = new Uint8Array(bufLen);
        analyser.getByteTimeDomainData(timeData);
        const wCtx = waveCanvas.getContext("2d");
        if (wCtx) {
          const w = waveCanvas.width = waveCanvas.parentElement?.clientWidth || 600;
          const h = waveCanvas.height = 100;
          wCtx.clearRect(0, 0, w, h);
          wCtx.fillStyle = "rgba(0,0,0,0.3)";
          wCtx.fillRect(0, 0, w, h);
          const gradient = wCtx.createLinearGradient(0, 0, w, 0);
          gradient.addColorStop(0, "#60a5fa");
          gradient.addColorStop(0.5, "#a855f7");
          gradient.addColorStop(1, "#06b6d4");
          wCtx.strokeStyle = gradient;
          wCtx.lineWidth = 2;
          wCtx.beginPath();
          const slice = w / bufLen;
          let x = 0;
          for (let i = 0; i < bufLen; i++) {
            const v = timeData[i] / 128.0;
            const y = (v * h) / 2;
            i === 0 ? wCtx.moveTo(x, y) : wCtx.lineTo(x, y);
            x += slice;
          }
          wCtx.lineTo(w, h / 2);
          wCtx.stroke();
        }
      }

      // Band levels
      const newBands = BAND_RANGES.map(([lo, hi]) => {
        let sum = 0;
        for (let i = lo; i < hi && i < bufLen; i++) sum += dataArray[i];
        return sum / (hi - lo) / 255 * 100;
      });
      setBands(newBands);
    };
    draw();
  };

  const clearAudio = () => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    if (audioRef.current) audioRef.current.pause();
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
      analyserRef.current = null;
    }
    sourceCreated.current = false;
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioFile(null);
    setAudioUrl(null);
    setIsPlaying(false);
    setBands(new Array(7).fill(0));
  };

  useEffect(() => {
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      if (audioCtxRef.current) audioCtxRef.current.close().catch(() => {});
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-[1200px] mx-auto">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-3">🔬 Frequency Analyzer</h1>
        <p className="text-apple-gray text-lg">Real-time spectral analysis with live FFT visualizations</p>
      </div>

      {!audioFile ? (
        <div onClick={() => fileRef.current?.click()} className="glass-card p-12 text-center cursor-pointer hover:border-accent-blue/30 max-w-xl mx-auto">
          <input ref={fileRef} type="file" accept="audio/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
          <div className="text-4xl mb-4">📡</div>
          <div className="font-semibold text-apple-white mb-1">Drop audio file for spectral analysis</div>
          <div className="text-sm text-apple-gray">WAV • MP3 • OGG • FLAC • WEBM</div>
        </div>
      ) : (
        <div className="space-y-6">
          <audio
            ref={audioRef}
            src={audioUrl || ""}
            onTimeUpdate={() => setCurrTime(audioRef.current?.currentTime || 0)}
            onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
            onEnded={() => { setIsPlaying(false); if (animRef.current) cancelAnimationFrame(animRef.current); }}
            crossOrigin="anonymous"
          />

          {/* Playback controls */}
          <div className="glass-card p-4 flex items-center gap-4">
            <button onClick={togglePlay} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-lg hover:bg-white/20">
              {isPlaying ? "⏸" : "▶️"}
            </button>
            <div className="flex-1">
              <input
                type="range" min={0} max={duration || 1} step={0.1} value={currentTime}
                onChange={(e) => { if (audioRef.current) audioRef.current.currentTime = Number(e.target.value); }}
                className="w-full h-1 rounded-full appearance-none bg-white/10 accent-accent-blue"
              />
              <div className="flex justify-between text-xs text-apple-gray mt-1">
                <span>{fmt(currentTime)}</span>
                <span className="truncate px-2 font-medium text-apple-white">{audioFile.name}</span>
                <span>{fmt(duration)}</span>
              </div>
            </div>
            <button onClick={clearAudio} className="text-xs text-apple-gray hover:text-red-400">✕</button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Visualizations */}
            <div className="lg:col-span-2 space-y-4">
              {/* FFT Spectrum */}
              <div className="glass-card overflow-hidden">
                <div className="px-4 py-2 bg-white/[0.03] border-b border-white/[0.06] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs">⚡</span>
                    <span className="text-[10px] font-semibold text-apple-gray uppercase tracking-wider">Real-Time FFT Spectrum</span>
                  </div>
                  {isPlaying && (
                    <div className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                      <span className="text-[10px] text-red-400 font-bold">LIVE</span>
                    </div>
                  )}
                </div>
                <canvas ref={fftCanvasRef} className="w-full block" style={{ height: "200px" }} />
              </div>

              {/* Waveform */}
              <div className="glass-card overflow-hidden">
                <div className="px-4 py-2 bg-white/[0.03] border-b border-white/[0.06] flex items-center gap-2">
                  <span className="text-xs">〰️</span>
                  <span className="text-[10px] font-semibold text-apple-gray uppercase tracking-wider">Live Waveform</span>
                </div>
                <canvas ref={waveCanvasRef} className="w-full block" style={{ height: "100px" }} />
              </div>
            </div>

            {/* Band Analysis */}
            <div className="space-y-4">
              <div className="glass-card p-5">
                <h3 className="text-xs font-bold text-apple-gray uppercase mb-4">Frequency Bands</h3>
                <div className="space-y-3">
                  {BAND_NAMES.map((name, i) => (
                    <div key={name}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-apple-white">{name}</span>
                        <span className="text-[10px] text-apple-gray">{BAND_FREQS[i]}</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-100" style={{ width: `${bands[i]}%`, backgroundColor: BAND_COLORS[i] }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="glass-card p-5">
                <h3 className="text-xs font-bold text-apple-gray uppercase mb-3">File Info</h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between"><span className="text-apple-gray">File</span><span className="text-apple-white truncate ml-2">{audioFile.name}</span></div>
                  <div className="flex justify-between"><span className="text-apple-gray">Size</span><span>{(audioFile.size / 1024).toFixed(1)} KB</span></div>
                  <div className="flex justify-between"><span className="text-apple-gray">Duration</span><span>{fmt(duration)}</span></div>
                  <div className="flex justify-between"><span className="text-apple-gray">Format</span><span>{audioFile.type || "unknown"}</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
