import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import BentoGrid from "@/components/BentoGrid";
import ScrollReveal from "@/components/ScrollReveal";
import Capabilities from "@/components/Capabilities";
import CTA from "@/components/CTA";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <main className="relative bg-black min-h-screen">
      <Navbar />
      <Hero />
      <BentoGrid />
      <ScrollReveal />
      <Capabilities />
      <CTA />
      <Footer />
    </main>
  );
}
