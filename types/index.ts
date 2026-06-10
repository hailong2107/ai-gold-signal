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
export type Timeframe = "5M" | "15M" | "1H" | "4H" | "1D";
export type TradingMode = "conservative" | "balanced" | "aggressive";
export type Locale = "en" | "vi";

export interface AISignal {
  signal: SignalType;
  confidence: number;
  risk: RiskLevel;
  analysis: string;
  beginnerExplanation: string;
  stopLoss: number | null;
  takeProfit: number | null;
  timeframe: Timeframe;
  timestamp: number;
}

export interface DashboardData {
  price: GoldPrice;
  indicators: TechnicalIndicators;
  signal: AISignal;
  history: HistoricalPrice[];
  timeframe: Timeframe;
}

export interface Commentary {
  id: number;
  contentEn: string;
  contentVi: string;
  sentiment: "bullish" | "bearish" | "neutral";
  goldPrice: number;
  createdAt: string;
}

export interface NewsSentiment {
  id: number;
  headline: string;
  source: string | null;
  url: string | null;
  sentiment: "bullish" | "bearish" | "neutral";
  summaryEn: string | null;
  summaryVi: string | null;
  impactScore: number | null;
  publishedAt: string | null;
  analyzedAt: string;
}

export interface UserPreferences {
  userId: string;
  language: Locale;
  tradingMode: TradingMode;
  preferredTimeframe: Timeframe;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}
