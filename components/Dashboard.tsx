"use client";

import { useEffect, useState, useCallback } from "react";
import { RefreshCw } from "lucide-react";
import { PriceCard } from "@/components/PriceCard";
import { SignalBadge } from "@/components/SignalBadge";
import { AnalysisCard } from "@/components/AnalysisCard";
import { IndicatorsCard } from "@/components/IndicatorsCard";
import { GoldChart } from "@/components/GoldChart";
import type { DashboardData } from "@/types";

export function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/analyze");
      if (!res.ok) throw new Error("fetch failed");
      const json = await res.json();
      setData(json);
      setLastUpdate(new Date());
    } catch (err) {
      console.error("Failed to fetch data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-yellow-500" />
          <p className="text-sm text-zinc-500">Loading market data...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-zinc-400">Unable to load market data</p>
          <button
            onClick={fetchData}
            className="mt-4 rounded-lg bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">
            AI Gold Signal
          </h1>
          <p className="text-sm text-zinc-500">
            Real-time AI-powered gold trading analysis
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdate && (
            <span className="text-xs text-zinc-600" suppressHydrationWarning>
              {lastUpdate.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={fetchData}
            className="rounded-lg bg-white/5 p-2 text-zinc-400 transition hover:bg-white/10 hover:text-white"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Top: Price + Signal */}
      <div className="grid gap-4 md:grid-cols-2">
        <PriceCard price={data.price} />
        <SignalBadge signal={data.signal} />
      </div>

      {/* Middle: AI Analysis */}
      <AnalysisCard signal={data.signal} />

      {/* Bottom: Chart + Indicators */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <GoldChart data={data.history} />
        </div>
        <IndicatorsCard
          indicators={data.indicators}
          price={data.price.price}
        />
      </div>

      {/* Footer */}
      <div className="pb-4 text-center text-xs text-zinc-700">
        AI signals are for educational purposes only. Not financial advice.
        Always do your own research.
      </div>
    </div>
  );
}
