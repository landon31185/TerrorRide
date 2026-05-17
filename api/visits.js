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

  if (req.method === 'GET') {
    if (!url || !token) return res.json({ total: 0, homie: 0, outsider: 0 });
    const results = await redis([
      ['GET', 'visits:total'],
      ['GET', 'visits:homie'],
      ['GET', 'visits:outsider'],
    ]);
    return res.json({
      total:    parseInt(results[0]?.result) || 0,
      homie:    parseInt(results[1]?.result) || 0,
      outsider: parseInt(results[2]?.result) || 0,
    });
  }

  if (req.method === 'POST') {
    if (!url || !token) return res.json({ ok: true });
    const type = ['homie', 'outsider'].includes(req.body?.type) ? req.body.type : 'outsider';
    try {
      await redis([['INCR', 'visits:total'], ['INCR', `visits:${type}`]]);
    } catch { /* non-blocking */ }
    return res.json({ ok: true });
  }

  res.status(405).json({ error: 'Method not allowed' });
};
