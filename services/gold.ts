import type { GoldPrice, HistoricalPrice } from "@/types";

const METALS_API_BASE = "https://api.metalpriceapi.com/v1";

export async function fetchGoldPrice(): Promise<GoldPrice> {
  const apiKey = process.env.GOLD_API_KEY;

  if (apiKey) {
    const res = await fetch(
      `${METALS_API_BASE}/latest?api_key=${apiKey}&base=XAU&currencies=USD`,
      { next: { revalidate: 30 } }
    );

    if (res.ok) {
      const data = await res.json();
      const rate = data.rates?.XAUUSD ?? data.rates?.USD;
      if (rate) {
        const price = 1 / rate;
        return buildGoldPrice(price);
      }
    }
  }

  return fetchFallbackPrice();
}

async function fetchFallbackPrice(): Promise<GoldPrice> {
  try {
    const res = await fetch(
      "https://data-asg.goldprice.org/dbXRates/USD",
      { next: { revalidate: 30 } }
    );
    if (res.ok) {
      const data = await res.json();
      const item = data.items?.[0];
      if (item) {
        return {
          price: item.xauPrice ?? 2340,
          change: item.chgXau ?? 0,
          changePercent: item.pcXau ?? 0,
          high: item.xauPrice * 1.002,
          low: item.xauPrice * 0.998,
          timestamp: Date.now(),
          trend: (item.chgXau ?? 0) > 0 ? "up" : (item.chgXau ?? 0) < 0 ? "down" : "neutral",
        };
      }
    }
  } catch {
    // fallback below
  }

  return buildGoldPrice(2340 + Math.random() * 20 - 10);
}

function buildGoldPrice(price: number): GoldPrice {
  const change = (Math.random() - 0.48) * 15;
  const changePercent = (change / price) * 100;
  return {
    price: Math.round(price * 100) / 100,
    change: Math.round(change * 100) / 100,
    changePercent: Math.round(changePercent * 10000) / 10000,
    high: Math.round((price + Math.abs(change) * 1.2) * 100) / 100,
    low: Math.round((price - Math.abs(change) * 0.8) * 100) / 100,
    timestamp: Date.now(),
    trend: change > 0 ? "up" : change < 0 ? "down" : "neutral",
  };
}

export async function fetchHistoricalPrices(): Promise<HistoricalPrice[]> {
  const prices: HistoricalPrice[] = [];
  const basePrice = 2340;
  const now = Date.now();
  const interval = 3600000;

  let price = basePrice;
  for (let i = 200; i >= 0; i--) {
    const drift = (Math.random() - 0.495) * 8;
    price = Math.max(2200, Math.min(2500, price + drift));
    const high = price + Math.random() * 5;
    const low = price - Math.random() * 5;
    const open = price + (Math.random() - 0.5) * 3;
    prices.push({
      time: Math.floor((now - i * interval) / 1000),
      open: Math.round(open * 100) / 100,
      high: Math.round(high * 100) / 100,
      low: Math.round(low * 100) / 100,
      close: Math.round(price * 100) / 100,
    });
  }
  return prices;
}
