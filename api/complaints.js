module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const url      = process.env.KV_REST_API_URL   || process.env.UPSTASH_REDIS_REST_URL;
  const token    = process.env.KV_REST_API_TOKEN  || process.env.UPSTASH_REDIS_REST_TOKEN;
  const resendKey = process.env.RESEND_API_KEY || process.env.RESEND_KEY || process.env.RESEND_ADMIN;

  if (!url || !token) return res.status(503).json({ error: 'Not configured' });

  const { name, email, desc } = req.body || {};
  if (!name || !email || !desc) return res.status(400).json({ error: 'Missing fields' });

  const redis = async (cmds) => {
    const r = await fetch(`${url}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(cmds),
    });
    return r.json();
  };

  const id = Date.now().toString();
  const [incrResult] = await redis([['INCR', 'complaints:count']]);
  const count = (incrResult.result || 1) + 3222;

  await redis([
    ['SET', `complaint:${id}`, JSON.stringify({ id, name, email, desc, number: count, timestamp: Date.now() })],
    ['LPUSH', 'complaint:ids', id],
  ]);

  console.log('resendKey set:', !!resendKey, 'to:', email);
  if (resendKey) {
    const date = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https%3A%2F%2Fterrorride.vercel.app%2Fnoise.html&bgcolor=f5f0e8&color=1a1a1a`;
    const safeDesc = String(desc).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    const safeName = String(name).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'City of Seattle <onboarding@resend.dev>',
        to: email,
        subject: `Official Narc Certification — Complaint #WS-${count}`,
        html: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f5f0e8;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f0e8;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border:2px solid #1a1a1a;max-width:600px;">

        <!-- Header -->
        <tr>
          <td style="background:#1a3a5c;padding:24px 32px;text-align:center;">
            <div style="font-size:32px;margin-bottom:8px;">&#9878;</div>
            <div style="color:#fff;font-family:Arial,sans-serif;font-size:11px;letter-spacing:3px;text-transform:uppercase;">City of Seattle</div>
            <div style="color:#aac4e0;font-family:Arial,sans-serif;font-size:10px;letter-spacing:1px;margin-top:4px;">Office of Noise Disturbance &amp; Resident Relations — West Seattle District</div>
          </td>
        </tr>

        <!-- Gold bar -->
        <tr><td style="background:#c8a84b;height:4px;"></td></tr>

        <!-- Title -->
        <tr>
          <td style="padding:32px 40px 16px;text-align:center;border-bottom:1px solid #ddd;">
            <div style="font-size:11px;letter-spacing:4px;text-transform:uppercase;color:#888;font-family:Arial,sans-serif;margin-bottom:12px;">Official Government Document</div>
            <h1 style="margin:0;font-size:28px;font-family:Georgia,serif;color:#1a1a1a;letter-spacing:1px;">OFFICIAL NARC CERTIFICATION</h1>
            <div style="margin-top:16px;font-family:Arial,sans-serif;font-size:12px;color:#555;">
              Complaint No. <strong>#WS-${count}</strong> &nbsp;&bull;&nbsp; Filed: <strong>${date}</strong>
            </div>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px 40px;">

            <p style="font-size:15px;line-height:1.7;color:#1a1a1a;margin:0 0 20px;">
              This document certifies that <strong>${safeName}</strong> has voluntarily and of their own free will
              identified themselves as a <strong>Narc</strong> by filing a noise disturbance complaint
              with the City of Seattle against a working band.
            </p>

            <p style="font-size:13px;color:#555;margin:0 0 24px;font-family:Arial,sans-serif;">
              The following complaint was submitted under oath and has been entered into the permanent public record:
            </p>

            <!-- Their complaint -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
              <tr>
                <td style="border-left:4px solid #1a3a5c;background:#f5f0e8;padding:20px 24px;">
                  <div style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#888;font-family:Arial,sans-serif;margin-bottom:10px;">Complaint as filed</div>
                  <p style="margin:0;font-size:14px;line-height:1.7;color:#1a1a1a;font-style:italic;">"${safeDesc}"</p>
                  <div style="margin-top:12px;font-size:11px;color:#888;font-family:Arial,sans-serif;">— ${safeName}, ${date}</div>
                </td>
              </tr>
            </table>

            <p style="font-size:14px;line-height:1.7;color:#1a1a1a;margin:0 0 28px;">
              This certification is legally binding in the sense that it is a document that exists.
              It may be <strong>printed and displayed</strong> in your workplace, vehicle, or refrigerator door.
              It may also be laminated. We recommend laminating it.
            </p>

            <!-- QR code -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
              <tr>
                <td align="center" style="border:1px solid #ddd;padding:24px;">
                  <img src="${qrUrl}" width="150" height="150" alt="QR code" style="display:block;margin:0 auto 12px;">
                  <div style="font-family:Arial,sans-serif;font-size:11px;color:#888;letter-spacing:1px;">SCAN TO FILE YOUR OWN COMPLAINT</div>
                  <div style="font-family:Arial,sans-serif;font-size:10px;color:#aaa;margin-top:4px;">terrorride.vercel.app/noise.html</div>
                </td>
              </tr>
            </table>

            <!-- Signature -->
            <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #ddd;padding-top:24px;margin-top:4px;">
              <tr>
                <td style="padding-top:24px;">
                  <p style="font-size:13px;color:#1a1a1a;margin:0 0 4px;font-style:italic;">Gerald Fink</p>
                  <p style="font-size:11px;color:#555;margin:0;font-family:Arial,sans-serif;">Deputy Director, NDR-7<br>Office of Noise &amp; Grievance Resolution<br>City of Seattle — West Seattle District</p>
                </td>
                <td align="right" valign="bottom">
                  <div style="font-family:Arial,sans-serif;font-size:10px;color:#aaa;letter-spacing:1px;">REF: #WS-${count}</div>
                </td>
              </tr>
            </table>

          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#1a1a1a;padding:16px 32px;text-align:center;">
            <p style="margin:0;font-family:Arial,sans-serif;font-size:11px;color:#666;">
              Terror Ride has been notified. They said <em style="color:#999;">"sick, another one."</em>
            </p>
            <p style="margin:8px 0 0;font-family:Arial,sans-serif;font-size:10px;color:#444;">
              Powered by CivicEngage&reg; &nbsp;|&nbsp; seattle.gov &nbsp;|&nbsp; This is a parody
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
    const emailBody = await emailRes.json();
    console.log('Resend status:', emailRes.status, JSON.stringify(emailBody));
  }

  return res.json({ ok: true, number: count });
};
