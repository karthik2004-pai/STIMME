"use client";

import { motion } from "framer-motion";

export default function CTA() {
  return (
    <section id="cta" className="relative py-40 md:py-56 px-6 overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[500px] rounded-full bg-gradient-to-r from-accent-blue/[0.08] via-accent-purple/[0.06] to-accent-cyan/[0.08] blur-[120px] pointer-events-none" />

      <div className="relative z-10 max-w-[800px] mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
        >
          <h2 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-[-0.04em] leading-[1.05] mb-6">
            Ready to hear
            <br />
            <span className="text-gradient">the future?</span>
          </h2>

          <p className="text-lg md:text-xl text-apple-gray max-w-lg mx-auto mb-12 leading-relaxed">
            Start classifying audio with AI in seconds. No setup required.
            Free to explore.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <motion.a
              href="/app"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
              className="group relative px-10 py-4 rounded-full bg-gradient-to-r from-accent-blue to-accent-purple text-white text-sm font-semibold shadow-lg shadow-accent-blue/20 hover:shadow-accent-blue/30 transition-shadow duration-300"
            >
              Launch Stimme
              <span className="ml-2 inline-block group-hover:translate-x-1 transition-transform duration-300">
                →
              </span>
            </motion.a>

            <a
              href="#features"
              className="px-10 py-4 rounded-full border border-white/[0.12] text-sm font-medium text-apple-gray hover:text-apple-white hover:border-white/[0.25] transition-all duration-300"
            >
              View Features
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
