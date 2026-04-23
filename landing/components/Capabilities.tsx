"use client";

import { motion } from "framer-motion";

const capabilities = [
  {
    number: "01",
    title: "Upload & Classify",
    description:
      "Drag and drop any audio file — WAV, MP3, OGG, FLAC. Our YAMNet-based pipeline instantly identifies the sound source with high confidence across 521 pre-trained classes.",
    accent: "bg-accent-blue",
  },
  {
    number: "02",
    title: "Record & Analyze",
    description:
      "Capture audio directly from your microphone. Watch the real-time waveform render as you speak, then get instant classification with a single click.",
    accent: "bg-accent-purple",
  },
  {
    number: "03",
    title: "Train Custom Models",
    description:
      "Create new sound categories, upload training samples, and train custom neural networks on your own data. Your model, your rules — ready in minutes.",
    accent: "bg-accent-cyan",
  },
  {
    number: "04",
    title: "Deploy & Scale",
    description:
      "Switch between pre-trained and custom models instantly. Full API access for integration into any workflow. Built for production from day one.",
    accent: "bg-accent-blue",
  },
];

export default function Capabilities() {
  return (
    <section id="capabilities" className="relative py-32 md:py-48 px-6">
      <div className="max-w-[1200px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24">
          {/* Left — sticky heading */}
          <div className="lg:sticky lg:top-32 lg:self-start">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.7 }}
            >
              <h2 className="text-apple-gray text-lg font-medium mb-4 tracking-wide uppercase">
                Capabilities
              </h2>
              <p className="text-4xl md:text-5xl font-bold tracking-[-0.035em] text-apple-white leading-tight mb-6">
                Sound intelligence,{" "}
                <span className="text-gradient">reimagined.</span>
              </p>
              <p className="text-lg text-apple-gray leading-relaxed max-w-md">
                From raw audio to actionable insight — Stimme handles the entire
                pipeline with precision and speed.
              </p>
            </motion.div>
          </div>

          {/* Right — scrolling cards */}
          <div className="flex flex-col gap-6">
            {capabilities.map((cap, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: 40 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{
                  duration: 0.6,
                  delay: i * 0.1,
                  ease: [0.25, 0.46, 0.45, 0.94],
                }}
                className="glass-card p-8 group"
              >
                <div className="flex items-start gap-6">
                  {/* Number indicator */}
                  <div className="flex-shrink-0">
                    <div
                      className={`w-10 h-10 rounded-xl ${cap.accent}/10 border border-white/[0.08] flex items-center justify-center`}
                    >
                      <span className="text-xs font-bold text-apple-gray group-hover:text-apple-white transition-colors">
                        {cap.number}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-apple-white mb-2 tracking-tight">
                      {cap.title}
                    </h3>
                    <p className="text-sm text-apple-gray leading-relaxed">
                      {cap.description}
                    </p>
                  </div>
                </div>

                {/* Hover accent bar */}
                <div className="mt-6 h-[1px] w-full bg-gradient-to-r from-transparent via-white/[0.06] to-transparent group-hover:via-white/[0.15] transition-all duration-500" />
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
