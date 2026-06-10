export const dynamic = "force-dynamic";

import type { ReactNode } from "react";
import { Inter } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getLocale } from "next-intl/server";
import type { Metadata } from "next";
import { Header } from "@/components/Header";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AI Gold Signal — Smart Trading Dashboard",
  description: "AI-powered gold trading signals with real-time technical analysis",
};

export default async function LocaleLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} className="dark">
      <body className={`${inter.className} min-h-screen bg-zinc-950 antialiased`}>
        <NextIntlClientProvider messages={messages}>
          <Header />
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
