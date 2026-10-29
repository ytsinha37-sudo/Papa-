export default async function handler(req, res) {
  res.setHeader("Cache-Control", "s-maxage=15, stale-while-revalidate=30");

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      ok: false,
      error: "Server is missing ALPHA_VANTAGE_API_KEY. Add it in Vercel Project Settings → Environment Variables."
    });
  }

  const interval = String(req.query.interval || "1min");
  const allowedIntervals = new Set(["1min", "5min", "15min", "30min", "60min"]);
  if (!allowedIntervals.has(interval)) {
    return res.status(400).json({ ok: false, error: "Unsupported interval" });
  }

  const url = new URL("https://www.alphavantage.co/query");
  url.searchParams.set("function", "FX_INTRADAY");
  url.searchParams.set("from_symbol", "EUR");
  url.searchParams.set("to_symbol", "USD");
  url.searchParams.set("interval", interval);
  url.searchParams.set("outputsize", "compact");
  url.searchParams.set("apikey", apiKey);

  try {
    const upstream = await fetch(url.toString(), {
      headers: { "Accept": "application/json" },
      signal: AbortSignal.timeout(8000)
    });

    if (!upstream.ok) {
      return res.status(502).json({
        ok: false,
        error: `Alpha Vantage returned HTTP ${upstream.status}`
      });
    }

    const data = await upstream.json();

    // Alpha Vantage often reports quota/plan errors inside a 200 response.
    if (data["Error Message"] || data["Information"] || data["Note"]) {
      return res.status(502).json({
        ok: false,
        error: data["Error Message"] || data["Information"] || data["Note"],
        hint: "Check the API key, request quota, and whether FX_INTRADAY is included in your plan."
      });
    }

    const seriesKey = Object.keys(data).find(k => k.toLowerCase().includes("time series"));
    if (!seriesKey || !data[seriesKey] || typeof data[seriesKey] !== "object") {
      return res.status(502).json({
        ok: false,
        error: "Unexpected Alpha Vantage response format",
        responseKeys: Object.keys(data)
      });
    }

    const rawSeries = data[seriesKey];
    const candles = Object.entries(rawSeries).map(([time, v]) => ({
      time,
      open: Number(v["1. open"]),
      high: Number(v["2. high"]),
      low: Number(v["3. low"]),
      close: Number(v["4. close"])
    })).filter(c =>
      Number.isFinite(c.open) && Number.isFinite(c.high) &&
      Number.isFinite(c.low) && Number.isFinite(c.close)
    ).sort((a, b) => new Date(a.time) - new Date(b.time));

    if (!candles.length) {
      return res.status(502).json({ ok: false, error: "No valid candle rows in API response" });
    }

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
      error: error.name === "TimeoutError" ? "Alpha Vantage request timed out" : "Could not reach Alpha Vantage",
      detail: error.message
    });
  }
}