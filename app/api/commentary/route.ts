import { NextResponse } from "next/server";
import { fetchGoldPrice, fetchHistoricalPrices } from "@/services/gold";
import { calculateIndicators } from "@/utils/indicators";
import { saveCommentary, getLatestCommentary } from "@/services/commentary";

export const dynamic = "force-dynamic";

// GET — fetch latest commentary (for the dashboard)
export async function GET() {
  try {
    const latest = await getLatestCommentary();
    return NextResponse.json(latest ?? { contentEn: null, contentVi: null });
  } catch {
    return NextResponse.json({ error: "Failed to fetch commentary" }, { status: 500 });
  }
}

// POST — generate and save new commentary (called by cron)
export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [price, history] = await Promise.all([
      fetchGoldPrice(),
      fetchHistoricalPrices("1H"),
    ]);

    const indicators = calculateIndicators(history);
    const commentary = await saveCommentary(price, indicators);

    return NextResponse.json({ success: true, commentary });
  } catch {
    return NextResponse.json({ error: "Failed to generate commentary" }, { status: 500 });
  }
}
