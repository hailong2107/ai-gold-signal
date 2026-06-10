// All routes include the Header which reads the auth session server-side —
// they must be dynamic (no static prerendering).
export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AI Gold Signal — Smart Trading Dashboard",
  description:
    "AI-powered gold trading signals with real-time technical analysis",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.className} min-h-screen bg-zinc-950 antialiased`}
      >
        <Header />
        {children}
      </body>
    </html>
  );
}
