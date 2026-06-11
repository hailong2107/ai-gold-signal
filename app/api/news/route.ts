import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { analyzeNewsSentiment } from "@/services/gemini";
import { saveNewsSentiment, getLatestNews } from "@/services/database";
import {
  getCachedHeadlines, setCachedHeadlines,
  getCachedNews, setCachedNews,
} from "@/lib/cache";

export const dynamic = "force-dynamic";

const NEWS_STALE_MS = 2 * 60 * 60 * 1000; // 2 hours

type NewsSource = {
  url: string;
  name: string;
  lang: "en" | "vi";
  limit: number;
};

const NEWS_SOURCES: NewsSource[] = [
  { url: "https://www.kitco.com/rss/kitconews.xml",                      name: "Kitco",         lang: "en", limit: 4 },
  { url: "https://www.investing.com/rss/news_14.rss",                    name: "Investing.com", lang: "en", limit: 4 },
  { url: "https://www.mining.com/category/gold/feed/",                   name: "Mining.com",    lang: "en", limit: 3 },
  { url: "https://feeds.marketwatch.com/marketwatch/topstories/",        name: "MarketWatch",   lang: "en", limit: 3 },
  { url: "https://feeds.finance.yahoo.com/rss/2.0/headline?s=GC%3DF",   name: "Yahoo Finance", lang: "en", limit: 3 },
  { url: "https://cafef.vn/rss/thi-truong-chung-khoan.rss",              name: "CafeF",         lang: "vi", limit: 3 },
  { url: "https://cafef.vn/rss/kinh-te-the-gioi.rss",                    name: "CafeF Quốc tế", lang: "vi", limit: 3 },
  { url: "https://vneconomy.vn/rss/thi-truong.rss",                      name: "VnEconomy",     lang: "vi", limit: 3 },
];

type RawHeadline = { headline: string; source: string; url: string; lang: "en" | "vi" };

async function fetchFromSource(src: NewsSource): Promise<RawHeadline[]> {
  try {
    const res = await fetch(src.url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; GoldSignalBot/1.0)",
        "Accept": "application/rss+xml, application/xml, text/xml",
      },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return [];

    const xml = await res.text();
    const items = xml.match(/<item>([\s\S]*?)<\/item>/g) ?? [];
    const results: RawHeadline[] = [];

    for (const item of items.slice(0, src.limit)) {
      const title =
        item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1] ??
        item.match(/<title>(.*?)<\/title>/)?.[1];
      const link =
        item.match(/<link>(.*?)<\/link>/)?.[1] ??
        item.match(/<guid[^>]*>(https?:\/\/[^<]+)<\/guid>/)?.[1];

      if (title) {
        results.push({
          headline: title.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim(),
          source: src.name,
          url: link?.trim() ?? src.url,
          lang: src.lang,
        });
      }
    }
    return results;
  } catch {
    return [];
  }
}

async function fetchAllHeadlines(): Promise<RawHeadline[]> {
  const cached = await getCachedHeadlines<RawHeadline[]>();
  if (cached) return cached;

  const results = await Promise.allSettled(NEWS_SOURCES.map(fetchFromSource));
  const headlines: RawHeadline[] = [];
  for (const r of results) {
    if (r.status === "fulfilled") headlines.push(...r.value);
  }

  const seen = new Set<string>();
  const unique = headlines.filter((h) => {
    const key = h.headline.toLowerCase().slice(0, 60);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  if (unique.length > 0) await setCachedHeadlines(unique);
  return unique;
}

async function fetchAndAnalyzeNews() {
  const raw = await fetchAllHeadlines();
  if (raw.length === 0) return [];

  const headlineHash = createHash("md5")
    .update(raw.map((h) => h.headline).join("|"))
    .digest("hex")
    .slice(0, 16);

  type AnalyzedItem = {
    headline: string; source: string; url: string;
    sentiment: "bullish" | "bearish" | "neutral";
    summaryEn: string; summaryVi: string; impactScore: number;
  };

  const cached = await getCachedNews<AnalyzedItem[]>(headlineHash);
  if (cached) {
    // already saved to DB previously — just return
    return cached;
  }

  const enHeadlines = raw.filter((h) => h.lang === "en");
  const viHeadlines = raw.filter((h) => h.lang === "vi");

  const [enAnalyzed, viAnalyzed] = await Promise.all([
    enHeadlines.length > 0 ? analyzeNewsSentiment(enHeadlines.map((h) => h.headline)) : [],
    viHeadlines.length > 0 ? analyzeNewsSentiment(viHeadlines.map((h) => h.headline)) : [],
  ]);

  const items: AnalyzedItem[] = [
    ...enAnalyzed.map((a, i) => ({
      headline: a.headline,
      source: enHeadlines[i]?.source ?? "Unknown",
      url: enHeadlines[i]?.url ?? "",
      sentiment: a.sentiment,
      summaryEn: a.summaryEn,
      summaryVi: a.summaryVi,
      impactScore: a.impactScore,
    })),
    ...viAnalyzed.map((a, i) => ({
      headline: a.headline,
      source: viHeadlines[i]?.source ?? "Unknown",
      url: viHeadlines[i]?.url ?? "",
      sentiment: a.sentiment,
      summaryEn: a.summaryEn,
      summaryVi: a.summaryVi,
      impactScore: a.impactScore,
    })),
  ].sort((a, b) => b.impactScore - a.impactScore).slice(0, 10);

  await Promise.all([
    saveNewsSentiment(items),
    setCachedNews(headlineHash, items),
  ]);

  return items;
}

// ── GET — served to dashboard ─────────────────────────────────────────────────
// If DB is empty or stale (> 2h), fetch+analyze inline so the page always has data.
export async function GET() {
  try {
    const rows = await getLatestNews(6);

    // Check freshness — analyzedAt is the DB timestamp
    const isFresh =
      rows.length > 0 &&
      Date.now() - new Date((rows[0] as { analyzed_at: string }).analyzed_at).getTime() <
        NEWS_STALE_MS;

    if (isFresh) {
      return NextResponse.json(rows);
    }

    // Stale or empty — fetch fresh (may take 3-5s on first call)
    await fetchAndAnalyzeNews();
    const fresh = await getLatestNews(6);
    return NextResponse.json(fresh);
  } catch (err) {
    console.error("[news] GET error:", err);
    // Return whatever is in DB as fallback
    try {
      return NextResponse.json(await getLatestNews(6));
    } catch {
      return NextResponse.json([]);
    }
  }
}

// ── POST — called by cron to keep news fresh in background ───────────────────
export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const items = await fetchAndAnalyzeNews();
    return NextResponse.json({ success: true, count: items.length });
  } catch {
    return NextResponse.json({ error: "Failed to process news" }, { status: 500 });
  }
}
