import { ImageResponse } from '@vercel/og';

export const config = { runtime: 'edge' };

export default async function handler(req) {
  const { searchParams, origin } = new URL(req.url);
  const title = searchParams.get('title') || 'Terror Ride';
  const tag   = searchParams.get('tag')   || 'West Seattle, WA';

  let font;
  try {
    font = await fetch(`${origin}/fonts/HFucktura-Heavy.otf`).then(r => r.arrayBuffer());
  } catch {}

  const titleLen = title.length;
  const fontSize = titleLen > 60 ? 52 : titleLen > 40 ? 66 : titleLen > 25 ? 80 : 96;

  const fonts = font
    ? [{ name: 'HFucktura', data: font, weight: 700, style: 'normal' }]
    : [];

  const fontFamily = font ? 'HFucktura' : 'serif';

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        background: '#0a0000',
        padding: '60px 72px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background blood glow */}
      <div style={{
        position: 'absolute', bottom: '-120px', right: '-120px',
        width: '700px', height: '700px',
        background: 'radial-gradient(circle, rgba(191,0,0,0.45) 0%, rgba(80,0,0,0.2) 40%, transparent 70%)',
        borderRadius: '50%', display: 'flex',
      }} />

      {/* Top accent glow */}
      <div style={{
        position: 'absolute', top: '-100px', left: '30%',
        width: '500px', height: '300px',
        background: 'radial-gradient(ellipse, rgba(36,227,157,0.08) 0%, transparent 70%)',
        display: 'flex',
      }} />

      {/* Left red bar */}
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0,
        width: '8px', background: '#BF0000', display: 'flex',
      }} />

      {/* Top section: wordmark + tag */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{
          fontFamily,
          fontSize: '22px',
          color: '#24e39d',
          letterSpacing: '10px',
          textTransform: 'uppercase',
          display: 'flex',
        }}>
          TERROR RIDE
        </div>

        {tag ? (
          <div style={{
            fontFamily,
            fontSize: '14px',
            color: 'rgba(255,255,255,0.45)',
            letterSpacing: '4px',
            textTransform: 'uppercase',
            display: 'flex',
          }}>
            {tag}
          </div>
        ) : null}
      </div>

      {/* Main title */}
      <div style={{
        fontFamily,
        fontSize: `${fontSize}px`,
        color: '#ffffff',
        lineHeight: 1.05,
        maxWidth: '1020px',
        display: 'flex',
        alignItems: 'flex-end',
        flex: 1,
        paddingTop: '32px',
        paddingBottom: '32px',
      }}>
        {title}
      </div>

      {/* Bottom: URL */}
      <div style={{
        fontFamily,
        fontSize: '16px',
        color: 'rgba(255,255,255,0.25)',
        letterSpacing: '3px',
        display: 'flex',
      }}>
        terror-ride.vercel.app
      </div>
    </div>,
    {
      width: 1200,
      height: 630,
      fonts,
    }
  );
}
