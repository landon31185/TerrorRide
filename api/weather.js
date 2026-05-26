module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  const url   = process.env.KV_REST_API_URL   || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN  || process.env.UPSTASH_REDIS_REST_TOKEN;

  // Check Redis cache (5-min TTL)
  if (url && token) {
    try {
      const cached = await fetch(`${url}/get/tr_weather_cache`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then(r => r.json());
      if (cached.result) return res.json(JSON.parse(cached.result));
    } catch {}
  }

  const apiKey = process.env.AMBIENT_API_KEY;
  const appKey = process.env.AMBIENT_APPLICATION_KEY;
  if (!apiKey || !appKey) return res.status(503).json({ error: 'no keys' });

  let data;
  try {
    data = await fetch(
      `https://api.ambientweather.net/v1/devices?apiKey=${apiKey}&applicationKey=${appKey}`
    ).then(r => r.json());
  } catch {
    return res.status(503).json({ error: 'fetch failed' });
  }

  const d = data?.[0]?.lastData;
  if (!d) {
    console.error('[weather] Ambient API response:', JSON.stringify(data));
    return res.status(503).json({ error: 'no data', raw: data });
  }

  console.log('[weather] device fields:', Object.keys(d).join(', '));

  const tempf    = d.tempf    ?? d.temp1f   ?? d.tempinf;
  const humidity = d.humidity ?? d.humidityin;
  const feelsLike = d.feelsLike ?? d.feelsLikef ?? tempf;

  if (tempf == null) {
    return res.status(503).json({ error: 'no temp field', fields: Object.keys(d) });
  }

  const payload = {
    tempf,
    feelsLike,
    humidity,
    windspeedmph: d.windspeedmph ?? 0,
    hourlyrainin: d.hourlyrainin ?? 0,
    ts:           Date.now(),
  };

  // Store in Redis with 5-min TTL
  if (url && token) {
    fetch(`${url}/set/tr_weather_cache`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: JSON.stringify(payload), ex: 300 }),
    }).catch(() => {});
  }

  res.json(payload);
};
