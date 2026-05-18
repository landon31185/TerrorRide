const REDIS_URL   = process.env.KV_REST_API_URL   || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN  || process.env.UPSTASH_REDIS_REST_TOKEN;
const RESEND_KEY  = process.env.RESEND_API_KEY || process.env.RESEND_KEY || process.env.RESEND_ADMIN;
const ADMIN_KEY   = process.env.CAMPAIGN_ADMIN_KEY || 'changeme';
const SITE_URL    = 'https://terrorride.vercel.app';

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

  // GET ?admin=1&key=X → list recent campaigns
  if (req.method === 'GET' && req.query?.admin === '1') {
    if (req.query.key !== ADMIN_KEY) return res.status(403).json({ error: 'Forbidden' });
    if (!REDIS_URL || !REDIS_TOKEN) return res.status(503).json({ error: 'Not configured' });
    const idsResult = await redis([['LRANGE', 'campaign:recent', 0, 9]]);
    const ids = idsResult[0]?.result || [];
    if (!ids.length) return res.json({ campaigns: [] });
    const dataResults = await redis(ids.map(id => ['GET', `campaign:${id}`]));
    const campaigns = dataResults.map(r => {
      try { return JSON.parse(r.result); } catch { return null; }
    }).filter(Boolean);
    return res.json({ campaigns });
  }

  // POST { subject, body, key } → send campaign
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { subject, body, key } = req.body || {};
  if (key !== ADMIN_KEY) return res.status(403).json({ error: 'Forbidden' });
  if (!subject || !body) return res.status(400).json({ error: 'Missing subject or body' });
  if (!REDIS_URL || !REDIS_TOKEN) return res.status(503).json({ error: 'Not configured' });
  if (!RESEND_KEY) return res.status(503).json({ error: 'Resend not configured' });

  const subResults = await redis([['SMEMBERS', 'subscribers']]);
  const subscribers = subResults[0]?.result || [];
  if (!subscribers.length) return res.json({ sent: 0, failed: 0, total: 0 });

  const safeBody = String(body)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');

  let sent = 0;
  let failed = 0;

  for (const email of subscribers) {
    const unsubUrl = `${SITE_URL}/api/subscribe?action=unsubscribe&email=${encodeURIComponent(email)}`;
    try {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'Terror Ride <onboarding@resend.dev>',
          to: email,
          subject,
          html: `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#111;border:1px solid #222;max-width:560px;">
        <tr>
          <td style="padding:32px 40px 20px;border-bottom:1px solid #222;">
            <div style="font-family:Arial,sans-serif;font-size:10px;letter-spacing:6px;text-transform:uppercase;color:#24e39d;">TERROR RIDE</div>
            <div style="font-family:Arial,sans-serif;font-size:9px;letter-spacing:2px;color:#555;margin-top:4px;text-transform:uppercase;">West Seattle, WA &mdash; Est. 2009</div>
          </td>
        </tr>
        <tr>
          <td style="padding:32px 40px 40px;">
            <p style="font-size:15px;line-height:1.8;color:#e0e0e0;margin:0;">${safeBody}</p>
          </td>
        </tr>
        <tr>
          <td style="background:#000;padding:16px 40px;border-top:1px solid #222;">
            <p style="margin:0;font-size:10px;color:#444;font-family:Arial,sans-serif;">
              You signed up at terrorride.vercel.app/noise.html because you were already there anyway.
              &nbsp;<a href="${unsubUrl}" style="color:#666;">Unsubscribe</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
        }),
      });
      if (r.status < 500) sent++;
      else failed++;
    } catch {
      failed++;
    }
  }

  const id = Date.now().toString();
  const record = JSON.stringify({ subject, sent, failed, total: subscribers.length, sentAt: new Date().toISOString() });
  await redis([
    ['SET', `campaign:${id}`, record],
    ['LPUSH', 'campaign:recent', id],
    ['LTRIM', 'campaign:recent', 0, 9],
  ]);

  console.log('Campaign sent:', { subject, sent, failed, total: subscribers.length });
  return res.json({ sent, failed, total: subscribers.length });
};
