"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { AISignal } from "@/types";

export function SignalBadge({ signal }: { signal: AISignal }) {
  const color =
    signal.signal === "BUY"
      ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
      : signal.signal === "SELL"
        ? "bg-red-500/20 text-red-400 border-red-500/30"
        : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";

  const riskColor =
    signal.risk === "Low"
      ? "text-emerald-400"
      : signal.risk === "Medium"
        ? "text-yellow-400"
        : "text-red-400";

  return (
    <Card className="border-white/10 bg-white/5 backdrop-blur-xl">
      <CardContent className="flex flex-col items-center gap-4 p-6">
        <div className="text-sm font-medium text-zinc-400">AI Signal</div>
        <Badge
          className={`px-6 py-2 text-2xl font-bold ${color} border`}
          variant="outline"
        >
          {signal.signal}
        </Badge>
        <div className="flex items-center gap-6 text-sm">
          <div className="text-center">
            <div className="text-zinc-500">Confidence</div>
            <div className="text-lg font-bold text-white">
              {signal.confidence}%
            </div>
          </div>
          <div className="text-center">
            <div className="text-zinc-500">Risk</div>
            <div className={`text-lg font-bold ${riskColor}`}>
              {signal.risk}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
