import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "NINAuth — Decentralized Identity Verification",
    template: "%s | NINAuth",
  },
  description:
    "Nigeria's premier blockchain-based identity verification platform. Secure, privacy-preserving NIN management for citizens and institutions.",
  keywords: ["NIN", "identity", "Nigeria", "blockchain", "verification", "biometric"],
  authors: [{ name: "AofiOlujuwon Dele-Olukoju" }],
  openGraph: {
    title: "NINAuth — Decentralized Identity Verificatio",
    description: "Your Identity. Verified. Secured. Decentralized.",
    type: "website",
    locale: "en_NG",
  },
};

import { AuthProvider } from "@/lib/auth-context";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-surface-soft antialiased font-inter">
        <AuthProvider>
          <Navbar />
          <main className="min-h-screen">{children}</main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
