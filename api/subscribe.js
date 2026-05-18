const REDIS_URL   = process.env.KV_REST_API_URL   || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN  || process.env.UPSTASH_REDIS_REST_TOKEN;
const ADMIN_KEY   = process.env.CAMPAIGN_ADMIN_KEY || 'changeme';

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  const redis = async (cmds) => {
    const r = await fetch(`${REDIS_URL}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${REDIS_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(cmds),
    });
    return r.json();
  };

  // GET ?action=unsubscribe&email=X
  if (req.method === 'GET' && req.query?.action === 'unsubscribe') {
    const email = decodeURIComponent(req.query.email || '');
    if (email && REDIS_URL && REDIS_TOKEN) {
      await redis([['SREM', 'subscribers', email]]);
    }
    return res.redirect(302, '/?unsub=1');
  }

  // GET ?admin=1&key=X → list subscribers + count
  if (req.method === 'GET' && req.query?.admin === '1') {
    if (req.query.key !== ADMIN_KEY) return res.status(403).json({ error: 'Forbidden' });
    if (!REDIS_URL || !REDIS_TOKEN) return res.status(503).json({ error: 'Not configured' });
    const results = await redis([['SMEMBERS', 'subscribers']]);
    const list = results[0]?.result || [];
    return res.json({ count: list.length, subscribers: list });
  }

  // POST { email } → subscribe
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email } = req.body || {};
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email' });
  }
  if (!REDIS_URL || !REDIS_TOKEN) return res.status(503).json({ error: 'Not configured' });

  await redis([['SADD', 'subscribers', email.toLowerCase().trim()]]);
  return res.json({ ok: true });
};
