"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { RefreshCw, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { NewsSentiment } from "@/types";

const sentimentColors = {
  bullish: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  bearish: "border-red-500/30 bg-red-500/10 text-red-400",
  neutral: "border-zinc-500/30 bg-zinc-500/10 text-zinc-400",
};

export function NewsSentimentCard({ locale }: { locale: string }) {
  const [news, setNews] = useState<NewsSentiment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const t = useTranslations("news");

  const load = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    try {
      const res = await fetch("/api/news");
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data)) {
        setNews(
          data.map((row) => ({
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
    } catch {
      // silent
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Card className="border-white/10 bg-white/5 backdrop-blur-xl">
      <CardContent className="p-6">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>📡</span>
            <span className="text-sm font-medium text-zinc-400">{t("title")}</span>
          </div>
          <button
            onClick={() => load(true)}
            disabled={refreshing}
            className="rounded p-1 text-zinc-600 transition hover:text-zinc-300 disabled:opacity-40"
            title="Refresh news"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-lg bg-white/5 p-3 space-y-2">
                <Skeleton className="h-3 w-full bg-white/10" />
                <Skeleton className="h-3 w-4/5 bg-white/10" />
                <Skeleton className="h-2.5 w-1/2 bg-white/10" />
              </div>
            ))}
          </div>
        ) : news.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-4">
            <p className="text-sm text-zinc-600">{t("noNews")}</p>
            <button
              onClick={() => load(true)}
              disabled={refreshing}
              className="flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-1.5 text-xs text-zinc-400 transition hover:bg-white/10 disabled:opacity-50"
            >
              <RefreshCw className={`h-3 w-3 ${refreshing ? "animate-spin" : ""}`} />
              {refreshing ? "Đang tải..." : "Tải tin tức"}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {news.slice(0, 3).map((item) => (
              <div key={item.id} className="rounded-lg bg-white/5 p-3">
                <div className="mb-1 flex items-start justify-between gap-2">
                  <p className="flex-1 text-xs font-medium leading-tight text-zinc-300">
                    {item.url ? (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-white hover:underline inline-flex items-start gap-1"
                      >
                        {item.headline}
                        <ExternalLink className="mt-0.5 h-2.5 w-2.5 shrink-0 opacity-50" />
                      </a>
                    ) : (
                      item.headline
                    )}
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
                <p className="mt-1 text-xs text-zinc-600">
                  {item.impactScore != null && `${t("impact")}: ${item.impactScore}/10`}
                  {item.source && ` · ${item.source}`}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
