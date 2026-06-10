"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { GoldChart } from "./GoldChart";
import { IndicatorsCard } from "./IndicatorsCard";
import { MarketCommentary } from "./dashboard/MarketCommentary";
import { NewsSentimentCard } from "./dashboard/NewsSentimentCard";
import { CopilotChat } from "./chat/CopilotChat";
import { LearningTooltip } from "./dashboard/LearningTooltip";
import type { DashboardData, Timeframe } from "@/types";

const TIMEFRAMES: Timeframe[] = ["5M", "15M", "1H", "4H", "1D"];

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
};

export function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeframe, setTimeframe] = useState<Timeframe>("1H");
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const t = useTranslations();
  const locale = useLocale();

  const fetchData = useCallback(
    async (tf: Timeframe = timeframe, silent = false) => {
      if (!silent) setRefreshing(true);
      try {
        const res = await fetch(`/api/analyze?timeframe=${tf}`);
        if (!res.ok) throw new Error("fetch failed");
        const json = await res.json();
        setData({ ...json, timeframe: tf });
        setLastUpdate(new Date());
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [timeframe]
  );

  useEffect(() => {
    fetchData(timeframe);
    const id = setInterval(() => fetchData(timeframe, true), 60_000);
    return () => clearInterval(id);
  }, [timeframe, fetchData]);

  function onTimeframeChange(tf: Timeframe) {
    setTimeframe(tf);
    setLoading(true);
    fetchData(tf);
  }

  if (loading) return <DashboardSkeleton />;

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-zinc-400">{t("common.error")}</p>
          <button
            onClick={() => fetchData()}
            className="mt-4 rounded-lg bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20"
          >
            {t("common.retry")}
          </button>
        </div>
      </div>
    );
  }

  const { price, indicators, signal, history } = data;
  const signalColor =
    signal.signal === "BUY"
      ? "text-emerald-400"
      : signal.signal === "SELL"
        ? "text-red-400"
        : "text-yellow-400";

  const signalBg =
    signal.signal === "BUY"
      ? "bg-emerald-500/10 border-emerald-500/30"
      : signal.signal === "SELL"
        ? "bg-red-500/10 border-red-500/30"
        : "bg-yellow-500/10 border-yellow-500/30";

  const TrendIcon =
    price.trend === "up" ? TrendingUp : price.trend === "down" ? TrendingDown : Minus;

  const trendColor =
    price.trend === "up"
      ? "text-emerald-400"
      : price.trend === "down"
        ? "text-red-400"
        : "text-zinc-400";

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-white md:text-2xl">
            {t("dashboard.title")}
          </h1>
          <p className="text-sm text-zinc-500">{t("dashboard.subtitle")}</p>
        </div>

        <div className="flex items-center gap-3">
          {lastUpdate && (
            <span className="text-xs text-zinc-600" suppressHydrationWarning>
              {t("dashboard.lastUpdate")} {lastUpdate.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={() => fetchData()}
            disabled={refreshing}
            className="rounded-lg bg-white/5 p-2 text-zinc-400 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      <Tabs value={timeframe} onValueChange={(v) => onTimeframeChange(v as Timeframe)}>
        <TabsList className="bg-white/5">
          {TIMEFRAMES.map((tf) => (
            <TabsTrigger key={tf} value={tf} className="text-xs data-[state=active]:bg-yellow-500 data-[state=active]:text-zinc-950">
              {t(`timeframes.${tf}`)}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <AnimatePresence mode="wait">
        <motion.div
          key={timeframe}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          transition={{ duration: 0.3 }}
          className="grid gap-4 md:grid-cols-3"
        >
          {/* Price card */}
          <motion.div
            className="md:col-span-2 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl"
            whileHover={{ scale: 1.005 }}
          >
            <p className="mb-1 text-xs font-medium text-zinc-500">{t("price.label")}</p>
            <div className="flex flex-wrap items-baseline gap-3">
              <span className="text-4xl font-bold tracking-tight text-white md:text-5xl">
                ${price.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
              <span className={`flex items-center gap-1 text-sm font-medium ${trendColor}`}>
                <TrendIcon className="h-4 w-4" />
                {price.change > 0 ? "+" : ""}{price.change} ({price.changePercent.toFixed(2)}%)
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-4 text-xs text-zinc-500">
              <span>{t("price.high")}: ${price.high.toFixed(2)}</span>
              <span>{t("price.low")}: ${price.low.toFixed(2)}</span>
              <span className={`font-medium ${trendColor}`}>
                {t(`price.trend.${price.trend}`)}
              </span>
            </div>
          </motion.div>

          {/* Signal card */}
          <motion.div
            className={`rounded-2xl border p-6 backdrop-blur-xl ${signalBg}`}
            whileHover={{ scale: 1.005 }}
          >
            <p className="mb-3 text-xs font-medium text-zinc-500">{t("signal.label")}</p>
            <div className={`mb-3 text-4xl font-black tracking-tight ${signalColor}`}>
              {t(`signal.${signal.signal}`)}
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-500">{t("signal.confidence")}</span>
                <span className="font-semibold text-white">{signal.confidence}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">{t("signal.risk")}</span>
                <span className={`font-semibold ${
                  signal.risk === "Low" ? "text-emerald-400" :
                  signal.risk === "High" ? "text-red-400" : "text-yellow-400"
                }`}>{t(`risk.${signal.risk}`)}</span>
              </div>
              {signal.stopLoss && (
                <div className="flex justify-between">
                  <span className="text-zinc-500">{t("signal.stopLoss")}</span>
                  <span className="text-red-400 font-semibold">${signal.stopLoss.toFixed(2)}</span>
                </div>
              )}
              {signal.takeProfit && (
                <div className="flex justify-between">
                  <span className="text-zinc-500">{t("signal.takeProfit")}</span>
                  <span className="text-emerald-400 font-semibold">${signal.takeProfit.toFixed(2)}</span>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>

      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        transition={{ duration: 0.3, delay: 0.1 }}
        className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl"
      >
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base">🤖</span>
            <span className="text-sm font-medium text-zinc-400">{t("analysis.title")}</span>
          </div>
          <LearningTooltip type="signal" />
        </div>
        <p className="leading-relaxed text-zinc-200">{signal.analysis}</p>

        {/* Beginner explanation */}
        <details className="mt-3 group">
          <summary className="cursor-pointer text-xs text-yellow-500 hover:text-yellow-400 list-none flex items-center gap-1">
            <span className="group-open:hidden">▶</span>
            <span className="hidden group-open:inline">▼</span>
            {t("analysis.beginner")}
          </summary>
          <p className="mt-2 rounded-lg bg-yellow-500/5 p-3 text-sm text-zinc-300 ring-1 ring-yellow-500/10">
            {signal.beginnerExplanation}
          </p>
        </details>

        <p className="mt-3 text-xs text-zinc-600" suppressHydrationWarning>
          {t("analysis.updated")} {new Date(signal.timestamp).toLocaleTimeString()}
        </p>
      </motion.div>

      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        transition={{ duration: 0.3, delay: 0.15 }}
      >
        <GoldChart data={history} />
      </motion.div>

      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <IndicatorsCard indicators={indicators} price={price.price} />
      </motion.div>

      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        transition={{ duration: 0.3, delay: 0.25 }}
        className="grid gap-4 md:grid-cols-2"
      >
        <MarketCommentary locale={locale} />
        <NewsSentimentCard locale={locale} />
      </motion.div>

      <CopilotChat locale={locale} />
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-6">
      <div className="flex justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48 bg-white/5" />
          <Skeleton className="h-4 w-72 bg-white/5" />
        </div>
      </div>
      <Skeleton className="h-10 w-64 rounded-lg bg-white/5" />
      <div className="grid gap-4 md:grid-cols-3">
        <Skeleton className="md:col-span-2 h-36 rounded-2xl bg-white/5" />
        <Skeleton className="h-36 rounded-2xl bg-white/5" />
      </div>
      <Skeleton className="h-32 rounded-2xl bg-white/5" />
      <Skeleton className="h-64 rounded-2xl bg-white/5" />
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl bg-white/5" />
        ))}
      </div>
    </div>
  );
}
