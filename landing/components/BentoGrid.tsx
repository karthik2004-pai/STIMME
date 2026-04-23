"use client";

import { motion } from "framer-motion";

const features = [
  {
    title: "Instant Classification",
    subtitle: "521 sound classes. Zero delay.",
    description: "Powered by YAMNet deep learning. Upload any audio and get precise classification in milliseconds.",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    ),
    span: "md:col-span-2 md:row-span-2",
    accent: "from-accent-blue/20 to-transparent",
  },
  {
    title: "Live Recording",
    subtitle: "Capture. Classify. Instantly.",
    description: "Record directly from your microphone with real-time waveform visualization.",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
        <line x1="12" x2="12" y1="19" y2="22" />
      </svg>
    ),
    span: "md:col-span-1 md:row-span-1",
    accent: "from-accent-purple/20 to-transparent",
  },
  {
    title: "Custom Training",
    subtitle: "Your data. Your model.",
    description: "Train custom models on your own categories in minutes.",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    ),
    span: "md:col-span-1 md:row-span-1",
    accent: "from-accent-cyan/20 to-transparent",
  },
  {
    title: "Neural Architectures",
    subtitle: "YAMNet + Custom CNN.",
    description: "Choose between pre-trained transfer learning and custom deep neural networks.",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="20" height="20" rx="5" />
        <path d="M7 12h10" />
        <path d="M12 7v10" />
      </svg>
    ),
    span: "md:col-span-1 md:row-span-2",
    accent: "from-accent-blue/15 via-accent-purple/10 to-transparent",
  },
  {
    title: "Real-time Waveform",
    subtitle: "See sound, understand it.",
    description: "Watch audio signals transform into visual intelligence with live waveform rendering.",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 12h2l3-9 4 18 4-18 3 9h2" />
      </svg>
    ),
    span: "md:col-span-1 md:row-span-1",
    accent: "from-accent-purple/15 to-transparent",
  },
  {
    title: "Classification History",
    subtitle: "Every insight, tracked.",
    description: "Full audit trail of every classification with timestamps and confidence scores.",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
    span: "md:col-span-1 md:row-span-1",
    accent: "from-accent-cyan/15 to-transparent",
  },
];

const container = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 30, scale: 0.97 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.6,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  },
};

export default function BentoGrid() {
  return (
    <section id="features" className="relative py-32 md:py-48 px-6">
      <div className="max-w-[1200px] mx-auto">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7 }}
          className="text-center mb-20"
        >
          <h2 className="text-apple-gray text-lg font-medium mb-4 tracking-wide uppercase">
            Features
          </h2>
          <p className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-[-0.035em] text-apple-white">
            Everything you need.<br />
            <span className="text-apple-gray">Nothing you don&apos;t.</span>
          </p>
        </motion.div>

        {/* Bento Grid */}
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 auto-rows-[minmax(200px,auto)]"
        >
          {features.map((feature, i) => (
            <motion.div
              key={i}
              variants={item}
              className={`glass-card relative overflow-hidden p-8 flex flex-col justify-between ${feature.span}`}
            >
              {/* Gradient accent */}
              <div
                className={`absolute inset-0 bg-gradient-to-br ${feature.accent} opacity-60 pointer-events-none`}
              />

              <div className="relative z-10">
                {/* Icon */}
                <div className="w-12 h-12 rounded-2xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-apple-white mb-6">
                  {feature.icon}
                </div>

                {/* Title */}
                <h3 className="text-xl font-semibold text-apple-white mb-1 tracking-tight">
                  {feature.title}
                </h3>

                {/* Subtitle */}
                <p className="text-sm font-medium text-gradient mb-3">
                  {feature.subtitle}
                </p>

                {/* Description */}
                <p className="text-sm text-apple-gray leading-relaxed">
                  {feature.description}
                </p>
              </div>

              {/* Bottom decorative bar on large cards */}
              {feature.span.includes("row-span-2") && (
                <div className="relative z-10 mt-8">
                  <div className="flex gap-1">
                    {[32, 18, 44, 26, 38, 14, 48, 22, 36, 42, 20, 30].map((h, j) => (
                      <div
                        key={j}
                        className="flex-1 rounded-full bg-white/[0.06]"
                        style={{
                          height: `${h}px`,
                          opacity: 0.4 + (j % 5) * 0.08,
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
