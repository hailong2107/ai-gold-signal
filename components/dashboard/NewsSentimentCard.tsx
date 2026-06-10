"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { NewsSentiment } from "@/types";

export function NewsSentimentCard({ locale }: { locale: string }) {
  const [news, setNews] = useState<NewsSentiment[]>([]);
  const t = useTranslations("news");

  useEffect(() => {
    fetch("/api/news")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d)) {
          setNews(
            d.map((row) => ({
              id: row.id,
              headline: row.headline,
              source: row.source,
              url: row.url,
              sentiment: row.sentiment ?? "neutral",
              summaryEn: row.summary_en,
              summaryVi: row.summary_vi,
              impactScore: row.impact_score,
              publishedAt: row.published_at,
              analyzedAt: row.analyzed_at,
            }))
          );
        }
      })
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
        <div className="mb-3 flex items-center gap-2">
          <span>📡</span>
          <span className="text-sm font-medium text-zinc-400">{t("title")}</span>
        </div>

        {news.length === 0 ? (
          <p className="text-sm text-zinc-600">{t("noNews")}</p>
        ) : (
          <div className="space-y-3">
            {news.slice(0, 3).map((item) => (
              <div key={item.id} className="rounded-lg bg-white/5 p-3">
                <div className="mb-1 flex items-start justify-between gap-2">
                  <p className="text-xs font-medium text-zinc-300 leading-tight flex-1">
                    {item.headline}
                  </p>
                  <Badge
                    variant="outline"
                    className={`shrink-0 text-xs ${sentimentColors[item.sentiment]}`}
                  >
                    {t(item.sentiment)}
                  </Badge>
                </div>
                {(locale === "vi" ? item.summaryVi : item.summaryEn) && (
                  <p className="text-xs text-zinc-500">
                    {locale === "vi" ? item.summaryVi : item.summaryEn}
                  </p>
                )}
                {item.impactScore && (
                  <p className="mt-1 text-xs text-zinc-600">
                    {t("impact")}: {item.impactScore}/10
                    {item.source && ` · ${item.source}`}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
