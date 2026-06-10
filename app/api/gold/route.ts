import { NextResponse } from "next/server";
import { fetchGoldPrice, fetchHistoricalPrices } from "@/services/gold";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [price, history] = await Promise.all([
      fetchGoldPrice(),
      fetchHistoricalPrices(),
    ]);

    return NextResponse.json({ price, history });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch gold data" },
      { status: 500 }
    );
  }
}
