const VALID_IDS = new Set(['species', 'quiet', 'rock', 'pit']);

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  const { UPSTASH_REDIS_REST_URL: url, UPSTASH_REDIS_REST_TOKEN: token } = process.env;
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
  if (!VALID_IDS.has(id)) return res.status(400).json({ error: 'Invalid poll' });

  if (req.method === 'POST') {
    const answer = parseInt(req.body?.answer);
    if (![0, 1, 2].includes(answer)) return res.status(400).json({ error: 'Invalid answer' });
    await redis([['INCR', `poll:${id}:${answer}`]]);
  }

  const results = await redis([
    ['GET', `poll:${id}:0`],
    ['GET', `poll:${id}:1`],
    ['GET', `poll:${id}:2`],
  ]);

  res.json({ counts: results.map(r => parseInt(r.result) || 0) });
};
