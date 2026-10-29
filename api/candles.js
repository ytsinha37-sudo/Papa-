
export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({
      ok: false,
      error: "Method not allowed"
    });
  }

  const key = process.env.ALPHA_VANTAGE_API_KEY;

  if (!key) {
    return res.status(500).json({
      ok: false,
      error: "API key missing in Vercel Environment Variables"
    });
  }

  const interval = String(req.query.interval || "1min");
  const allowed = ["1min", "5min", "15min", "30min", "60min"];

  if (!allowed.includes(interval)) {
    return res.status(400).json({
      ok: false,
      error: "Invalid interval"
    });
  }

  const url = new URL("https://www.alphavantage.co/query");
  url.searchParams.set("function", "FX_INTRADAY");
  url.searchParams.set("from_symbol", "EUR");
  url.searchParams.set("to_symbol", "USD");
  url.searchParams.set("interval", interval);
  url.searchParams.set("outputsize", "compact");
  url.searchParams.set("apikey", key);

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      return res.status(502).json({
        ok: false,
        error: "Alpha Vantage HTTP error"
      });
    }

    if (
      data["Error Message"] ||
      data["Note"] ||
      data["Information"]
    ) {
      return res.status(502).json({
        ok: false,
        error:
          data["Error Message"] ||
          data["Note"] ||
          data["Information"]
      });
    }

    const seriesKey = Object.keys(data).find(
      k => k.toLowerCase().includes("time series")
    );

    if (!seriesKey) {
      return res.status(502).json({
        ok: false,
        error: "Candle data not found",
        responseKeys: Object.keys(data)
      });
    }

    const candles = Object.entries(data[seriesKey])
      .map(([time, c]) => ({
        time,
        open: Number(c["1. open"]),
        high: Number(c["2. high"]),
        low: Number(c["3. low"]),
        close: Number(c["4. close"])
      }))
      .filter(c =>
        [c.open, c.high, c.low, c.close].every(
          Number.isFinite
        )
      )
      .sort((a, b) =>
        new Date(a.time) - new Date(b.time)
      );

    return res.status(200).json({
      ok: true,
      source: "Alpha Vantage FX_INTRADAY",
      symbol: "EUR/USD",
      interval,
      count: candles.length,
      fetchedAt: new Date().toISOString(),
      candles
    });
  } catch (error) {
    return res.status(502).json({
      ok: false,
      error: "Unable to fetch candle data"
    });
  }
        }
