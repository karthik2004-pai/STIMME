"use client";

import { motion } from "framer-motion";

export default function Hero() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
      {/* Neural grid background */}
      <div className="neural-grid" />

      {/* Radial glow */}
      <div className="hero-glow top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />

      {/* Secondary glow orbs */}
      <div className="absolute w-[400px] h-[400px] rounded-full bg-accent-purple/[0.06] blur-[120px] top-[20%] left-[15%] animate-float" />
      <div className="absolute w-[300px] h-[300px] rounded-full bg-accent-cyan/[0.05] blur-[100px] bottom-[20%] right-[15%] animate-float" style={{ animationDelay: "3s" }} />

      {/* Content */}
      <div className="relative z-10 text-center px-6 max-w-5xl mx-auto">
        {/* Chip */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] backdrop-blur-sm mb-8"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-accent-blue animate-pulse" />
          <span className="text-xs font-medium text-apple-gray tracking-wide">
            AI Audio Intelligence Platform
          </span>
        </motion.div>

        {/* Main heading */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="text-6xl sm:text-7xl md:text-8xl lg:text-[6.5rem] font-bold tracking-[-0.04em] leading-[0.9] mb-6"
        >
          <span className="text-apple-white">Stimme.</span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-[-0.03em] leading-tight mb-8"
        >
          <span className="text-gradient">Intelligence, amplified.</span>
        </motion.p>

        {/* Description */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="text-lg md:text-xl text-apple-gray max-w-2xl mx-auto mb-12 leading-relaxed font-normal"
        >
          Instantly classify, analyze, and understand sound with deep learning.
          521 classes. Zero delay. Pure intelligence.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.0 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <a
            href="/app"
            className="group relative px-8 py-3.5 rounded-full bg-gradient-to-r from-accent-blue to-accent-purple text-white text-sm font-semibold hover:scale-105 transition-all duration-300 shadow-lg shadow-accent-blue/20"
          >
            Launch App →
          </a>
          <a
            href="#features"
            className="px-8 py-3.5 rounded-full border border-white/[0.15] text-sm font-medium text-apple-white hover:bg-white/[0.05] hover:border-white/[0.25] transition-all duration-300"
          >
            Explore Features
          </a>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 1 }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
          className="w-6 h-10 rounded-full border-2 border-white/[0.15] flex justify-center pt-2"
        >
          <div className="w-1 h-2 rounded-full bg-white/40" />
        </motion.div>
      </motion.div>
    </section>
  );
}
