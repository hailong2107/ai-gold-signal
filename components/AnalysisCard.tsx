"use client";

import { Brain } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { AISignal } from "@/types";

export function AnalysisCard({ signal }: { signal: AISignal }) {
  return (
    <Card className="border-white/10 bg-white/5 backdrop-blur-xl">
      <CardContent className="p-6">
        <div className="mb-3 flex items-center gap-2">
          <Brain className="h-5 w-5 text-purple-400" />
          <span className="text-sm font-medium text-zinc-400">
            AI Analysis
          </span>
        </div>
        <p className="leading-relaxed text-zinc-200">{signal.analysis}</p>
        <div className="mt-4 text-xs text-zinc-600">
          Updated {new Date(signal.timestamp).toLocaleTimeString()}
        </div>
      </CardContent>
    </Card>
  );
}
