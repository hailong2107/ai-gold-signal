"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { TechnicalIndicators } from "@/types";

function getRsiStatus(rsi: number) {
  if (rsi > 70) return { label: "Overbought", color: "text-red-400" };
  if (rsi < 30) return { label: "Oversold", color: "text-emerald-400" };
  return { label: "Neutral", color: "text-zinc-400" };
}

export function IndicatorsCard({
  indicators,
  price,
}: {
  indicators: TechnicalIndicators;
  price: number;
}) {
  const rsiStatus = getRsiStatus(indicators.rsi);
  const emaSignal = price > indicators.ema20 ? "Bullish" : "Bearish";
  const emaTrend = price > indicators.ema50 ? "Uptrend" : "Downtrend";

  return (
    <Card className="border-white/10 bg-white/5 backdrop-blur-xl">
      <CardContent className="p-6">
        <div className="mb-4 text-sm font-medium text-zinc-400">
          Technical Indicators
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg bg-white/5 p-3">
            <div className="text-xs text-zinc-500">RSI (14)</div>
            <div className="text-lg font-bold text-white">
              {indicators.rsi}
            </div>
            <div className={`text-xs ${rsiStatus.color}`}>
              {rsiStatus.label}
            </div>
          </div>

          <div className="rounded-lg bg-white/5 p-3">
            <div className="text-xs text-zinc-500">EMA 20</div>
            <div className="text-lg font-bold text-white">
              ${indicators.ema20.toFixed(2)}
            </div>
            <div
              className={`text-xs ${emaSignal === "Bullish" ? "text-emerald-400" : "text-red-400"}`}
            >
              {emaSignal}
            </div>
          </div>

          <div className="rounded-lg bg-white/5 p-3">
            <div className="text-xs text-zinc-500">EMA 50</div>
            <div className="text-lg font-bold text-white">
              ${indicators.ema50.toFixed(2)}
            </div>
            <div
              className={`text-xs ${emaTrend === "Uptrend" ? "text-emerald-400" : "text-red-400"}`}
            >
              {emaTrend}
            </div>
          </div>

          <div className="rounded-lg bg-white/5 p-3">
            <div className="text-xs text-zinc-500">MACD</div>
            <div className="text-lg font-bold text-white">
              {indicators.macd.macd}
            </div>
            {indicators.macd.crossover !== "none" && (
              <Badge
                variant="outline"
                className={`mt-1 text-xs ${
                  indicators.macd.crossover === "bullish"
                    ? "border-emerald-500/30 text-emerald-400"
                    : "border-red-500/30 text-red-400"
                }`}
              >
                {indicators.macd.crossover} crossover
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
