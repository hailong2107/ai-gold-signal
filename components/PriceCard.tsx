"use client";

import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { GoldPrice } from "@/types";

export function PriceCard({ price }: { price: GoldPrice }) {
  const trendColor =
    price.trend === "up"
      ? "text-emerald-400"
      : price.trend === "down"
        ? "text-red-400"
        : "text-zinc-400";

  const TrendIcon =
    price.trend === "up"
      ? TrendingUp
      : price.trend === "down"
        ? TrendingDown
        : Minus;

  return (
    <Card className="border-white/10 bg-white/5 backdrop-blur-xl">
      <CardContent className="p-6">
        <div className="mb-1 text-sm font-medium text-zinc-400">
          XAU/USD — Gold Price
        </div>
        <div className="flex items-baseline gap-3">
          <span className="text-4xl font-bold tracking-tight text-white">
            ${price.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
          <div className={`flex items-center gap-1 ${trendColor}`}>
            <TrendIcon className="h-4 w-4" />
            <span className="text-sm font-medium">
              {price.change > 0 ? "+" : ""}
              {price.change} ({price.changePercent.toFixed(2)}%)
            </span>
          </div>
        </div>
        <div className="mt-3 flex gap-4 text-xs text-zinc-500">
          <span>H: ${price.high.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          <span>L: ${price.low.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
        </div>
      </CardContent>
    </Card>
  );
}
