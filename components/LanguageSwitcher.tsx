"use client";

import { useRouter, usePathname } from "next/navigation";
import { useLocale } from "next-intl";

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  function switchTo(newLocale: string) {
    // Replace the locale segment at the start of the path
    const segments = pathname.split("/");
    segments[1] = newLocale;
    router.push(segments.join("/"));
  }

  return (
    <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 p-1">
      {(["en", "vi"] as const).map((lang) => (
        <button
          key={lang}
          onClick={() => switchTo(lang)}
          className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
            locale === lang
              ? "bg-yellow-500 text-zinc-950"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          {lang === "en" ? "EN" : "VI"}
        </button>
      ))}
    </div>
  );
}
