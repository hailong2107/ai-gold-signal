import { redirect } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getSignalHistory } from "@/services/database";
import { SignalHistoryTable } from "@/components/dashboard/SignalHistoryTable";

export default async function HistoryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const locale = await getLocale();
  if (!user) redirect(`/${locale}/login`);

  const t = await getTranslations("history");
  const signals = await getSignalHistory(50);

  const total = signals.length;
  const wins = signals.filter((s) => s.outcome === "win").length;
  const losses = signals.filter((s) => s.outcome === "loss").length;
  const closed = wins + losses;
  const winRate = closed > 0 ? Math.round((wins / closed) * 100) : null;
  const avgConf =
    total > 0
      ? Math.round(signals.reduce((s, r) => s + (r.confidence ?? 0), 0) / total)
      : 0;

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold text-white">{t("title")}</h1>
        <p className="text-sm text-zinc-500">{t("subtitle")}</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: t("totalSignals"), value: total },
          { label: t("winRate"), value: winRate !== null ? `${winRate}%` : "—" },
          { label: t("avgConfidence"), value: `${avgConf}%` },
          { label: t("accuracy"), value: closed > 0 ? `${wins}W / ${losses}L` : "—" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl"
          >
            <p className="text-xs text-zinc-500">{stat.label}</p>
            <p className="mt-1 text-2xl font-bold text-white">{stat.value}</p>
          </div>
        ))}
      </div>

      <SignalHistoryTable signals={signals} />
    </div>
  );
}
