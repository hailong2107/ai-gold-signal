// Root layout — minimal shell, just sets the HTML document.
// All page content and providers live in app/[locale]/layout.tsx.
import type { ReactNode } from "react";
import "./globals.css";

export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
