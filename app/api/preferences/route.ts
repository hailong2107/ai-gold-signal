import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { upsertUserPreferences } from "@/services/database";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const ok = await upsertUserPreferences(user.id, {
      language: body.language,
      trading_mode: body.trading_mode,
      preferred_timeframe: body.preferred_timeframe,
    });
    if (!ok) return NextResponse.json({ error: "Save failed" }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
