import { NextResponse } from "next/server";
import { sendTelegramAlert } from "@/services/telegram";
import type { AISignal, GoldPrice } from "@/types";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { signal, price } = body as { signal: AISignal; price: GoldPrice };

    if (!signal || !price) {
      return NextResponse.json(
        { error: "Missing signal or price data" },
        { status: 400 }
      );
    }

    const sent = await sendTelegramAlert(signal, price);

    return NextResponse.json({ success: sent });
  } catch {
    return NextResponse.json(
      { error: "Failed to send Telegram alert" },
      { status: 500 }
    );
  }
}
