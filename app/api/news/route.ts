import { NextResponse } from "next/server";
import { analyzeNewsSentiment } from "@/services/gemini";
import { saveNewsSentiment, getLatestNews } from "@/services/database";

export const dynamic = "force-dynamic";

// Gold-related news headlines (fetched from public RSS / scraped)
const GOLD_NEWS_SOURCES = [
  "https://feeds.finance.yahoo.com/rss/2.0/headline?s=GC=F&region=US&lang=en-US",
  "https://www.kitco.com/rss/kitconews.xml",
];

async function fetchHeadlines(): Promise<Array<{ headline: string; source: string; url: string }>> {
  const headlines: Array<{ headline: string; source: string; url: string }> = [];

  for (const feedUrl of GOLD_NEWS_SOURCES) {
    try {
      const res = await fetch(feedUrl, {
        headers: { "User-Agent": "Mozilla/5.0" },
        next: { revalidate: 1800 },
      });
      if (!res.ok) continue;

      const xml = await res.text();
      const items = xml.match(/<item>([\s\S]*?)<\/item>/g) ?? [];

      for (const item of items.slice(0, 5)) {
        const title = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1] ??
          item.match(/<title>(.*?)<\/title>/)?.[1];
        const link = item.match(/<link>(.*?)<\/link>/)?.[1];
        const sourceName = feedUrl.includes("kitco") ? "Kitco" : "Yahoo Finance";

        if (title) {
          headlines.push({
            headline: title.trim(),
            source: sourceName,
            url: link?.trim() ?? feedUrl,
          });
        }
      }
    } catch {
      continue;
    }
  }

  return headlines;
}

// GET — latest analyzed news from DB
export async function GET() {
  try {
    const news = await getLatestNews(6);
    return NextResponse.json(news);
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}

// POST — fetch + analyze + save (called by cron)
export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const raw = await fetchHeadlines();
    if (raw.length === 0) {
      return NextResponse.json({ success: true, count: 0, source: "no headlines" });
    }

    const analyzed = await analyzeNewsSentiment(raw.map((r) => r.headline));

    const items = analyzed.map((a, i) => ({
      headline: a.headline,
      source: raw[i]?.source,
      url: raw[i]?.url,
      sentiment: a.sentiment,
      summaryEn: a.summaryEn,
      summaryVi: a.summaryVi,
      impactScore: a.impactScore,
    }));

    await saveNewsSentiment(items);

    return NextResponse.json({ success: true, count: items.length });
  } catch {
    return NextResponse.json({ error: "Failed to process news" }, { status: 500 });
  }
}
