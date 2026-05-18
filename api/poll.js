const POLL_SIZES = { species: 3, quiet: 3, nimby: 6 };

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  const url   = process.env.KV_REST_API_URL   || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return res.status(503).json({ error: 'Not configured' });

  const redis = async (cmds) => {
    const r = await fetch(`${url}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(cmds),
    });
    return r.json();
  };

  const id = req.method === 'POST' ? req.body?.id : req.query?.id;
  const size = POLL_SIZES[id];
  if (!size) return res.status(400).json({ error: 'Invalid poll' });

  if (req.method === 'POST') {
    const answer = parseInt(req.body?.answer);
    if (isNaN(answer) || answer < 0 || answer >= size) return res.status(400).json({ error: 'Invalid answer' });
    await redis([['INCR', `poll:${id}:${answer}`]]);
  }

  const results = await redis(
    Array.from({ length: size }, (_, i) => ['GET', `poll:${id}:${i}`])
  );

  res.json({ counts: results.map(r => parseInt(r.result) || 0) });
};
