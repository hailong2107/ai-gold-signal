import { GoogleGenerativeAI } from "@google/generative-ai";
import type { GoldPrice, TechnicalIndicators, AISignal } from "@/types";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? "");

export async function analyzeWithGemini(
  price: GoldPrice,
  indicators: TechnicalIndicators
): Promise<AISignal> {
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const prompt = `You are a professional gold market analyst. Analyze the following gold (XAU/USD) market data and provide a trading signal.

Current Market Data:
- Price: $${price.price}
- Price Change: ${price.change > 0 ? "+" : ""}${price.change} (${price.changePercent}%)
- Trend: ${price.trend}
- Day High: $${price.high}
- Day Low: $${price.low}

Technical Indicators:
- RSI (14): ${indicators.rsi}
- EMA 20: $${indicators.ema20}
- EMA 50: $${indicators.ema50}
- MACD: ${indicators.macd.macd}
- MACD Signal: ${indicators.macd.signal}
- MACD Histogram: ${indicators.macd.histogram}
- MACD Crossover: ${indicators.macd.crossover}

Rules:
1. Do NOT predict exact future prices.
2. Be conservative and professional.
3. Explain in simple terms a beginner can understand.
4. Consider all indicators together, not just one.

Respond ONLY with valid JSON in this exact format:
{
  "signal": "BUY" or "SELL" or "HOLD",
  "confidence": number between 0 and 100,
  "risk": "Low" or "Medium" or "High",
  "analysis": "2-3 sentence beginner-friendly explanation"
}`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      signal: parsed.signal ?? "HOLD",
      confidence: Math.min(100, Math.max(0, parsed.confidence ?? 50)),
      risk: parsed.risk ?? "Medium",
      analysis: parsed.analysis ?? "Unable to generate analysis.",
      timestamp: Date.now(),
    };
  } catch {
    return generateFallbackSignal(price, indicators);
  }
}

function generateFallbackSignal(
  price: GoldPrice,
  indicators: TechnicalIndicators
): AISignal {
  let score = 0;

  if (indicators.rsi < 30) score += 2;
  else if (indicators.rsi < 45) score += 1;
  else if (indicators.rsi > 70) score -= 2;
  else if (indicators.rsi > 55) score -= 1;

  if (price.price > indicators.ema20) score += 1;
  else score -= 1;

  if (price.price > indicators.ema50) score += 1;
  else score -= 1;

  if (indicators.macd.crossover === "bullish") score += 2;
  else if (indicators.macd.crossover === "bearish") score -= 2;

  if (indicators.macd.histogram > 0) score += 1;
  else score -= 1;

  let signal: "BUY" | "SELL" | "HOLD";
  let analysis: string;

  if (score >= 3) {
    signal = "BUY";
    analysis =
      "Gold is showing bullish momentum. The price is trading above key moving averages and technical indicators suggest upward pressure. This could be a good entry point, but always use stop-losses.";
  } else if (score <= -3) {
    signal = "SELL";
    analysis =
      "Gold is showing bearish signals. The price has dropped below key moving averages and momentum indicators point downward. Consider reducing exposure or waiting for better entry points.";
  } else {
    signal = "HOLD";
    analysis =
      "Gold is in a neutral zone with mixed signals from technical indicators. It's best to wait for a clearer trend before making a move. Keep watching for breakout signals.";
  }

  const confidence = Math.min(95, 50 + Math.abs(score) * 8);
  const risk =
    Math.abs(score) >= 4 ? "Low" : Math.abs(score) >= 2 ? "Medium" : "High";

  return {
    signal,
    confidence,
    risk: risk as "Low" | "Medium" | "High",
    analysis,
    timestamp: Date.now(),
  };
}
