"use client";

import { useEffect, useRef, useState } from "react";
import {
  createChart,
  ColorType,
  CandlestickSeries,
  LineSeries,
  HistogramSeries,
  type UTCTimestamp,
} from "lightweight-charts";
import { Card, CardContent } from "@/components/ui/card";
import type { HistoricalPrice, IndicatorSeries } from "@/types";

const COLORS = {
  bg: "transparent",
  text: "#71717a",
  grid: "rgba(255,255,255,0.03)",
  border: "rgba(255,255,255,0.08)",
  cross: "rgba(255,255,255,0.12)",
  up: "#10b981",
  down: "#ef4444",
  ema20: "#f59e0b",   // amber
  ema50: "#3b82f6",   // blue
  rsi: "#a78bfa",     // violet
  macdLine: "#22d3ee",// cyan
  macdSig: "#f97316", // orange
  macdUp: "#10b981",
  macdDown: "#ef4444",
};

type ActivePane = "candle" | "rsi" | "macd";

export function GoldChart({
  data,
  indicatorSeries,
}: {
  data: HistoricalPrice[];
  indicatorSeries?: IndicatorSeries;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activePane, setActivePane] = useState<ActivePane>("candle");

  useEffect(() => {
    if (!containerRef.current || data.length === 0) return;

    const el = containerRef.current;

    const chart = createChart(el, {
      layout: {
        background: { type: ColorType.Solid, color: COLORS.bg },
        textColor: COLORS.text,
        fontSize: 11,
      },
      grid: {
        vertLines: { color: COLORS.grid },
        horzLines: { color: COLORS.grid },
      },
      width: el.clientWidth,
      height: 560,
      crosshair: {
        vertLine: { color: COLORS.cross, width: 1 },
        horzLine: { color: COLORS.cross, width: 1 },
      },
      timeScale: {
        borderColor: COLORS.border,
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: { borderColor: COLORS.border },
    });

    // ── Pane 0: Candlestick + EMA20 + EMA50 ──────────────────────────────
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: COLORS.up,
      downColor: COLORS.down,
      borderDownColor: COLORS.down,
      borderUpColor: COLORS.up,
      wickDownColor: COLORS.down,
      wickUpColor: COLORS.up,
    }, 0);

    candleSeries.setData(
      data.map((d) => ({
        time: d.time as UTCTimestamp,
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close,
      }))
    );

    if (indicatorSeries?.ema20.length) {
      const ema20Series = chart.addSeries(LineSeries, {
        color: COLORS.ema20,
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: true,
        title: "EMA20",
        crosshairMarkerVisible: false,
      }, 0);
      ema20Series.setData(
        indicatorSeries.ema20.map((d) => ({ time: d.time as UTCTimestamp, value: d.value }))
      );
    }

    if (indicatorSeries?.ema50.length) {
      const ema50Series = chart.addSeries(LineSeries, {
        color: COLORS.ema50,
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: true,
        title: "EMA50",
        crosshairMarkerVisible: false,
      }, 0);
      ema50Series.setData(
        indicatorSeries.ema50.map((d) => ({ time: d.time as UTCTimestamp, value: d.value }))
      );
    }

    // ── Pane 1: RSI ───────────────────────────────────────────────────────
    if (indicatorSeries?.rsi.length) {
      const rsiSeries = chart.addSeries(LineSeries, {
        color: COLORS.rsi,
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: true,
        title: "RSI(14)",
        autoscaleInfoProvider: () => ({
          priceRange: { minValue: 0, maxValue: 100 },
          margins: { above: 0.1, below: 0.1 },
        }),
      }, 1);
      rsiSeries.setData(
        indicatorSeries.rsi.map((d) => ({ time: d.time as UTCTimestamp, value: d.value }))
      );

      // OB / OS reference lines
      rsiSeries.createPriceLine({ price: 70, color: "rgba(239,68,68,0.4)", lineWidth: 1, lineStyle: 2, title: "OB" });
      rsiSeries.createPriceLine({ price: 30, color: "rgba(16,185,129,0.4)", lineWidth: 1, lineStyle: 2, title: "OS" });
      rsiSeries.createPriceLine({ price: 50, color: "rgba(255,255,255,0.1)", lineWidth: 1, lineStyle: 2, title: "" });
    }

    // ── Pane 2: MACD ──────────────────────────────────────────────────────
    if (indicatorSeries?.macd.length) {
      const histSeries = chart.addSeries(HistogramSeries, {
        priceLineVisible: false,
        lastValueVisible: false,
        title: "Histogram",
      }, 2);
      histSeries.setData(
        indicatorSeries.macd.map((d) => ({
          time: d.time as UTCTimestamp,
          value: d.histogram,
          color: d.histogram >= 0 ? "rgba(16,185,129,0.5)" : "rgba(239,68,68,0.5)",
        }))
      );

      const macdLine = chart.addSeries(LineSeries, {
        color: COLORS.macdLine,
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: true,
        title: "MACD",
        crosshairMarkerVisible: false,
      }, 2);
      macdLine.setData(
        indicatorSeries.macd.map((d) => ({ time: d.time as UTCTimestamp, value: d.macd }))
      );

      const signalLine = chart.addSeries(LineSeries, {
        color: COLORS.macdSig,
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: true,
        title: "Signal",
        crosshairMarkerVisible: false,
      }, 2);
      signalLine.setData(
        indicatorSeries.macd.map((d) => ({ time: d.time as UTCTimestamp, value: d.signal }))
      );
    }

    chart.timeScale().fitContent();

    const handleResize = () => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth });
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, [data, indicatorSeries]);

  return (
    <Card className="border-white/10 bg-white/5 backdrop-blur-xl">
      <CardContent className="p-4 md:p-6">
        {/* Header row */}
        <div className="mb-3 flex items-center justify-between gap-2 flex-wrap">
          <span className="text-sm font-medium text-zinc-400">XAU/USD Chart</span>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="flex items-center gap-1">
              <span className="h-2 w-4 rounded" style={{ background: COLORS.up }} />
              <span className="text-zinc-500">Bull</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-4 rounded" style={{ background: COLORS.down }} />
              <span className="text-zinc-500">Bear</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="h-0.5 w-4" style={{ background: COLORS.ema20 }} />
              <span className="text-zinc-500">EMA20</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="h-0.5 w-4" style={{ background: COLORS.ema50 }} />
              <span className="text-zinc-500">EMA50</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="h-0.5 w-4" style={{ background: COLORS.rsi }} />
              <span className="text-zinc-500">RSI</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="h-0.5 w-4" style={{ background: COLORS.macdLine }} />
              <span className="text-zinc-500">MACD</span>
            </span>
          </div>
        </div>

        {/* Chart container */}
        <div ref={containerRef} className="w-full" />

        {/* Pane labels */}
        <div className="mt-2 flex gap-4 text-xs text-zinc-600 select-none">
          <span>● Price + EMA20/50</span>
          <span>● RSI(14)</span>
          <span>● MACD(12,26,9)</span>
        </div>
      </CardContent>
    </Card>
  );
}
