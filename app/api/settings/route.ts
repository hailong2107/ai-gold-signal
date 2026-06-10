import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { upsertUserSettings } from "@/services/database";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();

    const ok = await upsertUserSettings(user.id, {
      telegram_bot_token: body.telegram_bot_token || null,
      telegram_chat_id: body.telegram_chat_id || null,
      alerts_enabled: Boolean(body.alerts_enabled),
      min_confidence: Number(body.min_confidence) || 75,
      alert_on_crossover: Boolean(body.alert_on_crossover),
      alert_on_rsi_breakout: Boolean(body.alert_on_rsi_breakout),
    });

    if (!ok) {
      return NextResponse.json({ error: "Save failed" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", user.id)
    .single();

  return NextResponse.json(data ?? {});
}
