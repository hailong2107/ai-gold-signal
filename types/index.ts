export interface GoldPrice {
  price: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  timestamp: number;
  trend: "up" | "down" | "neutral";
}

export interface HistoricalPrice {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface TechnicalIndicators {
  rsi: number;
  ema20: number;
  ema50: number;
  macd: {
    macd: number;
    signal: number;
    histogram: number;
    crossover: "bullish" | "bearish" | "none";
  };
}

export type SignalType = "BUY" | "SELL" | "HOLD";
export type RiskLevel = "Low" | "Medium" | "High";

export interface AISignal {
  signal: SignalType;
  confidence: number;
  risk: RiskLevel;
  analysis: string;
  timestamp: number;
}

export interface DashboardData {
  price: GoldPrice;
  indicators: TechnicalIndicators;
  signal: AISignal;
  history: HistoricalPrice[];
}
