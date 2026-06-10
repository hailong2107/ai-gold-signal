"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Commentary } from "@/types";

export function MarketCommentary({ locale }: { locale: string }) {
  const [commentary, setCommentary] = useState<Commentary | null>(null);
  const t = useTranslations("commentary");

  useEffect(() => {
    fetch("/api/commentary")
      .then((r) => r.json())
      .then((d) => setCommentary(d.id ? d : null))
      .catch(() => null);
  }, []);

  const sentimentColors = {
    bullish: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
    bearish: "border-red-500/30 bg-red-500/10 text-red-400",
    neutral: "border-zinc-500/30 bg-zinc-500/10 text-zinc-400",
  };

  return (
    <Card className="border-white/10 bg-white/5 backdrop-blur-xl">
      <CardContent className="p-6">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>📰</span>
            <span className="text-sm font-medium text-zinc-400">{t("title")}</span>
          </div>
          {commentary?.sentiment && (
            <Badge
              variant="outline"
              className={`text-xs ${sentimentColors[commentary.sentiment]}`}
            >
              {t(commentary.sentiment)}
            </Badge>
          )}
        </div>

        {commentary ? (
          <motion.p
            key={commentary.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-sm leading-relaxed text-zinc-300"
          >
            {locale === "vi" ? commentary.contentVi : commentary.contentEn}
          </motion.p>
        ) : (
          <p className="text-sm text-zinc-600">{t("subtitle")}</p>
        )}

        {commentary && (
          <p className="mt-3 text-xs text-zinc-600" suppressHydrationWarning>
            {new Date(commentary.createdAt).toLocaleString()}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
