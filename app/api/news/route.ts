import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { analyzeNewsSentiment } from "@/services/gemini";
import { saveNewsSentiment, getLatestNews } from "@/services/database";
import {
  getCachedHeadlines, setCachedHeadlines,
  getCachedNews, setCachedNews,
} from "@/lib/cache";

export const dynamic = "force-dynamic";

// ── News sources: reputable gold/finance outlets with public RSS ──────────
type NewsSource = {
  url: string;
  name: string;
  lang: "en" | "vi";
  limit: number;
};

const NEWS_SOURCES: NewsSource[] = [
  // English — gold-specific
  { url: "https://www.kitco.com/rss/kitconews.xml",                      name: "Kitco",        lang: "en", limit: 4 },
  { url: "https://www.investing.com/rss/news_14.rss",                    name: "Investing.com", lang: "en", limit: 4 },
  { url: "https://www.mining.com/category/gold/feed/",                   name: "Mining.com",   lang: "en", limit: 3 },
  // English — macro / Fed / USD (strongly correlated to gold)
  { url: "https://feeds.marketwatch.com/marketwatch/topstories/",        name: "MarketWatch",  lang: "en", limit: 3 },
  { url: "https://feeds.finance.yahoo.com/rss/2.0/headline?s=GC%3DF",   name: "Yahoo Finance", lang: "en", limit: 3 },
  // Vietnamese — finance & macro
  { url: "https://cafef.vn/rss/thi-truong-chung-khoan.rss",              name: "CafeF",         lang: "vi", limit: 3 },
  { url: "https://cafef.vn/rss/kinh-te-the-gioi.rss",                    name: "CafeF Quốc tế", lang: "vi", limit: 3 },
  { url: "https://vneconomy.vn/rss/thi-truong.rss",                      name: "VnEconomy",    lang: "vi", limit: 3 },
];

type RawHeadline = {
  headline: string;
  source: string;
  url: string;
  lang: "en" | "vi";
};

async function fetchFromSource(src: NewsSource): Promise<RawHeadline[]> {
  try {
    const res = await fetch(src.url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; GoldSignalBot/1.0; +https://ai-gold-signal.vercel.app)",
        "Accept": "application/rss+xml, application/xml, text/xml",
      },
      signal: AbortSignal.timeout(5000),
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
  // Check cache first
  const cached = await getCachedHeadlines<RawHeadline[]>();
  if (cached) return cached;

  // Fetch all sources in parallel
  const results = await Promise.allSettled(NEWS_SOURCES.map(fetchFromSource));

  const headlines: RawHeadline[] = [];
  for (const r of results) {
    if (r.status === "fulfilled") headlines.push(...r.value);
  }

  // Deduplicate by normalized headline
  const seen = new Set<string>();
  const unique = headlines.filter((h) => {
    const key = h.headline.toLowerCase().slice(0, 60);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  if (unique.length > 0) {
    await setCachedHeadlines(unique);
  }

  return unique;
}

// ── GET — serve latest analyzed news from DB (cached for dashboard) ───────
export async function GET() {
  try {
    const news = await getLatestNews(6);
    return NextResponse.json(news);
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}

// ── POST — fetch + analyze + save (called by cron, auth required) ─────────
export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const raw = await fetchAllHeadlines();
    if (raw.length === 0) {
      return NextResponse.json({ success: true, count: 0, source: "no headlines" });
    }

    // Build cache hash from the headline set so we skip re-analysis if nothing changed
    const headlineHash = createHash("md5")
      .update(raw.map((h) => h.headline).join("|"))
      .digest("hex")
      .slice(0, 16);

    const cached = await getCachedNews<ReturnType<typeof buildItems>>(headlineHash);
    if (cached) {
      return NextResponse.json({ success: true, count: cached.length, source: "cache" });
    }

    // Analyze only English headlines — Gemini generates both EN + VI summaries
    const enHeadlines = raw.filter((h) => h.lang === "en").map((h) => h.headline);
    const viHeadlines = raw.filter((h) => h.lang === "vi");

    const [enAnalyzed, viAnalyzed] = await Promise.all([
      enHeadlines.length > 0 ? analyzeNewsSentiment(enHeadlines) : Promise.resolve([]),
      viHeadlines.length > 0 ? analyzeNewsSentiment(viHeadlines.map((h) => h.headline)) : Promise.resolve([]),
    ]);

    const enItems = enAnalyzed.map((a, i) => {
      const source = raw.filter((h) => h.lang === "en")[i];
      return {
        headline: a.headline,
        source: source?.source ?? "Unknown",
        url: source?.url ?? "",
        sentiment: a.sentiment,
        summaryEn: a.summaryEn,
        summaryVi: a.summaryVi,
        impactScore: a.impactScore,
      };
    });

    const viItems = viAnalyzed.map((a, i) => ({
      headline: a.headline,
      source: viHeadlines[i]?.source ?? "Unknown",
      url: viHeadlines[i]?.url ?? "",
      sentiment: a.sentiment,
      summaryEn: a.summaryEn,
      summaryVi: a.summaryVi,
      impactScore: a.impactScore,
    }));

    const items = buildItems([...enItems, ...viItems]);

    await Promise.all([
      saveNewsSentiment(items),
      setCachedNews(headlineHash, items),
    ]);

    return NextResponse.json({ success: true, count: items.length, source: "fresh" });
  } catch {
    return NextResponse.json({ error: "Failed to process news" }, { status: 500 });
  }
}

function buildItems(analyzed: Array<{
  headline: string;
  source: string;
  url: string;
  sentiment: "bullish" | "bearish" | "neutral";
  summaryEn: string;
  summaryVi: string;
  impactScore: number;
}>) {
  return analyzed
    .sort((a, b) => b.impactScore - a.impactScore)
    .slice(0, 10);
}
