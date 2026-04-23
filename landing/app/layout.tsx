import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Stimme — AI Audio Intelligence",
  description:
    "Stimme is an AI-powered audio intelligence platform. Instantly classify, analyze, and understand sound with deep learning. 521+ sound classes. Zero delay.",
  keywords: ["AI", "audio", "sound classification", "deep learning", "Stimme", "audio intelligence"],
  openGraph: {
    title: "Stimme — Intelligence, amplified.",
    description: "AI-powered audio identification. Capture. Classify. Instantly.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="bg-black text-apple-white antialiased font-sans" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
