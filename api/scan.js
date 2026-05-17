const VALID_SOURCES = new Set(['coozie', 'sticker', 'poster']);

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  const url   = process.env.KV_REST_API_URL   || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

  const redis = async (cmds) => {
    const r = await fetch(`${url}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(cmds),
    });
    return r.json();
  };

  // Admin stats: GET /api/scan?admin=1
  if (req.method === 'GET' && req.query?.admin === '1') {
    if (!url || !token) return res.status(503).json({ error: 'Not configured' });
    const results = await redis([
      ['GET', 'scan:total'],
      ['GET', 'scan:coozie'],
      ['GET', 'scan:sticker'],
      ['GET', 'scan:poster'],
      ['GET', 'scan:unknown'],
    ]);
    const keys = ['total', 'coozie', 'sticker', 'poster', 'unknown'];
    const counts = {};
    keys.forEach((k, i) => { counts[k] = parseInt(results[i]?.result) || 0; });
    return res.json(counts);
  }

  // Track + redirect
  const source = VALID_SOURCES.has(req.query?.s) ? req.query.s : 'unknown';
  if (url && token) {
    try {
      await redis([
        ['INCR', 'scan:total'],
        ['INCR', `scan:${source}`],
      ]);
    } catch { /* non-blocking — don't fail the redirect */ }
  }

  res.redirect(302, '/scan.html');
};
