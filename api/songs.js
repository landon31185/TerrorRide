module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  const url      = process.env.KV_REST_API_URL   || process.env.UPSTASH_REDIS_REST_URL;
  const token    = process.env.KV_REST_API_TOKEN  || process.env.UPSTASH_REDIS_REST_TOKEN;
  const adminKey = process.env.ADMIN_KEY;
  const resendKey = process.env.RESEND_API_KEY;

  if (!url || !token) return res.status(503).json({ error: 'Not configured' });

  const redis = async (cmds) => {
    const r = await fetch(`${url}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(cmds),
    });
    return r.json();
  };

  const sendEmail = async ({ to, subject, html }) => {
    if (!resendKey) return;
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Terror Ride <onboarding@resend.dev>',
        to,
        subject,
        html,
      }),
    });
  };

  // POST — submit a song request
  if (req.method === 'POST') {
    const { name, song, email } = req.body || {};
    if (!name || !song || !email) return res.status(400).json({ error: 'Missing fields' });

    const id = Date.now().toString();
    const request = { id, name, song, email, status: 'pending', timestamp: Date.now() };

    await redis([
      ['SET', `song:req:${id}`, JSON.stringify(request)],
      ['LPUSH', 'song:ids', id],
    ]);

    await sendEmail({
      to: email,
      subject: 'We got it.',
      html: `
        <p style="font-family:sans-serif">Your request for <strong>${song}</strong> has been received by Terror Ride.</p>
        <p style="font-family:sans-serif">We're not saying we'll play it. We're saying we received it.</p>
        <p style="font-family:sans-serif">If we decide to create it, you'll hear from us.</p>
        <p style="font-family:sans-serif">— Terror Ride<br>West Seattle, WA</p>
      `,
    });

    return res.json({ ok: true });
  }

  // GET — list all requests (admin)
  if (req.method === 'GET') {
    if (!adminKey || req.query.key !== adminKey) return res.status(401).json({ error: 'Unauthorized' });

    const [idsResult] = await redis([['LRANGE', 'song:ids', 0, -1]]);
    const ids = idsResult.result || [];
    if (!ids.length) return res.json({ requests: [] });

    const results = await redis(ids.map(id => ['GET', `song:req:${id}`]));
    const requests = results.map(r => JSON.parse(r.result)).filter(Boolean);
    return res.json({ requests });
  }

  // PUT — fulfill a request (admin)
  if (req.method === 'PUT') {
    if (!adminKey || req.body?.key !== adminKey) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.body;
    const [dataResult] = await redis([['GET', `song:req:${id}`]]);
    const request = JSON.parse(dataResult.result);
    if (!request) return res.status(404).json({ error: 'Not found' });

    request.status = 'fulfilled';
    await redis([['SET', `song:req:${id}`, JSON.stringify(request)]]);

    await sendEmail({
      to: request.email,
      subject: `${request.song} has been created.`,
      html: `
        <p style="font-family:sans-serif">You asked Terror Ride to create <strong>${request.song}</strong>.</p>
        <p style="font-family:sans-serif">We made it.</p>
        <p style="font-family:sans-serif">It is exactly what you asked for and also nothing like what you asked for.</p>
        <p style="font-family:sans-serif">Come to the show.</p>
        <p style="font-family:sans-serif">— Terror Ride<br>West Seattle, WA</p>
      `,
    });

    return res.json({ ok: true });
  }

  res.status(405).json({ error: 'Method not allowed' });
};
