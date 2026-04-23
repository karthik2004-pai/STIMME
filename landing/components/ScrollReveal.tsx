"use client";

import { motion } from "framer-motion";

const lines = [
  { text: "Pro power.", color: "text-apple-white" },
  { text: "Mind-bending speed.", color: "text-gradient" },
  { text: "Built for intelligence.", color: "text-apple-gray" },
];

export default function ScrollReveal() {
  return (
    <section className="relative py-40 md:py-56 px-6 overflow-hidden">
      {/* Subtle center glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-accent-purple/[0.04] blur-[150px] pointer-events-none" />

      <div className="max-w-[1200px] mx-auto">
        <div className="flex flex-col items-center text-center gap-6">
          {lines.map((line, i) => (
            <motion.h2
              key={i}
              initial={{ opacity: 0, y: 50, filter: "blur(10px)" }}
              whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{
                duration: 0.9,
                delay: i * 0.15,
                ease: [0.25, 0.46, 0.45, 0.94],
              }}
              className={`text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-[-0.04em] leading-[1.05] ${line.color}`}
            >
              {line.text}
            </motion.h2>
          ))}
        </div>

        {/* Supplementary text */}
        <motion.p
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.7, delay: 0.5 }}
          className="text-center text-lg md:text-xl text-apple-gray max-w-xl mx-auto mt-16 leading-relaxed"
        >
          Stimme redefines how you interact with audio. From forensic analysis
          to real-time classification — experience sound like never before.
        </motion.p>
      </div>
    </section>
  );
}
