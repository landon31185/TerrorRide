const VALID_MAGNETS = new Set(['001', '002', '003', '004', '005', '006', '007']);

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

  // GET /api/magnet?admin=1 — dashboard stats
  if (req.method === 'GET' && req.query?.admin === '1') {
    if (!url || !token) return res.json({ total: 0, geo: {}, magnets: {}, recent: [] });

    const RESULTS = ['in_west_seattle', 'outside', 'gps_disabled'];
    const ids = [...VALID_MAGNETS];

    const cmds = [
      ['GET', 'magnet:total'],
      ...RESULTS.map(r => ['GET', `magnet:geo:${r}`]),
      // per-magnet: total + 3 geo breakdowns + unique IP count
      ...ids.flatMap(id => [
        ['GET',   `magnet:total:${id}`],
        ...RESULTS.map(r => ['GET', `magnet:geo:${r}:${id}`]),
        ['SCARD', `magnet:ips:${id}`],
      ]),
      ['LRANGE', 'magnet:recent', '0', '19'],
    ];

    const results = await redis(cmds);
    let i = 0;

    const total = parseInt(results[i++]?.result) || 0;
    const geo   = {};
    for (const r of RESULTS) geo[r] = parseInt(results[i++]?.result) || 0;

    const magnets = {};
    for (const id of ids) {
      magnets[id] = {
        total:          parseInt(results[i++]?.result) || 0,
        in_west_seattle: parseInt(results[i++]?.result) || 0,
        outside:         parseInt(results[i++]?.result) || 0,
        gps_disabled:    parseInt(results[i++]?.result) || 0,
        unique_ips:      parseInt(results[i++]?.result) || 0,
      };
    }

    const recentRaw = results[i]?.result || [];
    const recent = recentRaw.map(s => { try { return JSON.parse(s); } catch { return null; } }).filter(Boolean);

    return res.json({ total, geo, magnets, recent });
  }

  // POST /api/magnet — log a scan
  if (req.method === 'POST') {
    if (!url || !token) return res.json({ ok: true });

    const { magnet_id, geofence_result, message_shown } = req.body || {};
    const id     = VALID_MAGNETS.has(magnet_id) ? magnet_id : 'unknown';
    const result = ['in_west_seattle', 'outside', 'gps_disabled'].includes(geofence_result)
      ? geofence_result : 'gps_disabled';

    const rawIp  = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
    const masked = rawIp.replace(/(\.\d+)$/, '.xxx'); // mask last IPv4 octet

    const scan = JSON.stringify({ magnet_id: id, geofence_result: result, message_shown: message_shown || '', ts: Date.now() });

    try {
      await redis([
        ['INCR', 'magnet:total'],
        ['INCR', `magnet:total:${id}`],
        ['INCR', `magnet:geo:${result}`],
        ['INCR', `magnet:geo:${result}:${id}`],
        ['LPUSH', 'magnet:recent', scan],
        ['LTRIM', 'magnet:recent', '0', '99'],
        ['SADD',  `magnet:ips:${id}`, masked],
      ]);
    } catch { /* non-blocking */ }

    return res.json({ ok: true });
  }

  res.status(405).json({ error: 'Method not allowed' });
};
