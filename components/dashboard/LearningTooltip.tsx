"use client";

import { useState } from "react";
import { HelpCircle, X } from "lucide-react";
import { useTranslations } from "next-intl";

type TooltipType = "rsi" | "macd" | "ema" | "signal";

export function LearningTooltip({ type }: { type: TooltipType }) {
  const [open, setOpen] = useState(false);
  const t = useTranslations(`learning.${type}`);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="text-zinc-600 hover:text-zinc-400 transition"
        aria-label="Learn more"
      >
        <HelpCircle className="h-4 w-4" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-6 z-20 w-64 rounded-xl border border-yellow-500/20 bg-zinc-900 p-4 shadow-xl">
            <div className="mb-2 flex items-start justify-between gap-2">
              <p className="text-xs font-semibold text-yellow-400">{t("title")}</p>
              <button onClick={() => setOpen(false)} className="text-zinc-600 hover:text-zinc-400">
                <X className="h-3 w-3" />
              </button>
            </div>
            <p className="text-xs leading-relaxed text-zinc-400">{t("body")}</p>
          </div>
        </>
      )}
    </div>
  );
}
