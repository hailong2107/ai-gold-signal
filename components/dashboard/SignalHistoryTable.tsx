"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";

type SignalRow = {
  id: number;
  signal: string;
  confidence: number | null;
  risk: string | null;
  gold_price: number | null;
  timeframe: string | null;
  outcome: string | null;
  created_at: string;
};

export function SignalHistoryTable({ signals }: { signals: SignalRow[] }) {
  const t = useTranslations("history");

  const signalColor = (s: string) =>
    s === "BUY" ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10"
      : s === "SELL" ? "border-red-500/30 text-red-400 bg-red-500/10"
      : "border-yellow-500/30 text-yellow-400 bg-yellow-500/10";

  const outcomeColor = (o: string | null) =>
    o === "win" ? "text-emerald-400"
      : o === "loss" ? "text-red-400"
      : "text-zinc-500";

  if (signals.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-12 text-center text-zinc-500">
        {t("noHistory")}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5">
              {[t("columns.time"), t("columns.signal"), t("columns.price"),
                t("columns.confidence"), t("columns.timeframe"), t("columns.outcome")].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-zinc-500">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {signals.map((row, i) => (
              <tr
                key={row.id}
                className={`border-b border-white/5 transition hover:bg-white/5 ${
                  i % 2 === 0 ? "" : "bg-white/[0.02]"
                }`}
              >
                <td className="px-4 py-3 text-xs text-zinc-500" suppressHydrationWarning>
                  {new Date(row.created_at).toLocaleString()}
                </td>
                <td className="px-4 py-3">
                  <Badge variant="outline" className={`text-xs ${signalColor(row.signal)}`}>
                    {row.signal}
                  </Badge>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-zinc-300">
                  ${row.gold_price?.toFixed(2) ?? "—"}
                </td>
                <td className="px-4 py-3 text-xs text-zinc-300">
                  {row.confidence ?? "—"}%
                </td>
                <td className="px-4 py-3 text-xs text-zinc-400">
                  {row.timeframe ?? "1H"}
                </td>
                <td className={`px-4 py-3 text-xs font-medium ${outcomeColor(row.outcome)}`}>
                  {row.outcome ? t(`outcomes.${row.outcome}`) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
