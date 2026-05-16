import { ImageResponse } from '@vercel/og';

export const config = { runtime: 'edge' };

export default async function handler(req) {
  const { searchParams, origin } = new URL(req.url);
  const title = searchParams.get('title') || 'Terror Ride';
  const tag   = searchParams.get('tag')   || '';

  const font = await fetch(`${origin}/fonts/HFucktura-Heavy.otf`).then(r => r.arrayBuffer());

  const fontSize = title.length > 50 ? 48 : title.length > 30 ? 60 : 76;

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: '#000',
        padding: '64px 80px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Red left bar */}
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0,
        width: '10px', background: '#BF0000', display: 'flex',
      }} />

      {/* Radial glow bottom-right */}
      <div style={{
        position: 'absolute', bottom: '-80px', right: '-80px',
        width: '520px', height: '520px',
        background: 'radial-gradient(circle, rgba(191,0,0,0.35) 0%, transparent 65%)',
        borderRadius: '50%', display: 'flex',
      }} />

      {/* TERROR RIDE wordmark */}
      <div style={{
        fontFamily: 'HFucktura',
        fontSize: '26px',
        color: '#24e39d',
        letterSpacing: '8px',
        textTransform: 'uppercase',
        display: 'flex',
      }}>
        TERROR RIDE
      </div>

      {/* Tag */}
      {tag ? (
        <div style={{
          display: 'flex',
          marginTop: '20px',
        }}>
          <span style={{
            fontFamily: 'HFucktura',
            fontSize: '13px',
            color: '#aaa',
            letterSpacing: '3px',
            textTransform: 'uppercase',
            border: '1px solid #333',
            padding: '3px 12px',
            display: 'flex',
          }}>
            {tag}
          </span>
        </div>
      ) : null}

      {/* Title */}
      <div style={{
        fontFamily: 'HFucktura',
        fontSize: `${fontSize}px`,
        color: '#ffffff',
        lineHeight: 1.1,
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        maxWidth: '960px',
        marginTop: '16px',
      }}>
        {title}
      </div>

      {/* URL */}
      <div style={{
        fontFamily: 'HFucktura',
        fontSize: '18px',
        color: '#444',
        letterSpacing: '3px',
        textTransform: 'lowercase',
        display: 'flex',
      }}>
        terrorride.vercel.app
      </div>
    </div>,
    {
      width: 1200,
      height: 630,
      fonts: [{
        name: 'HFucktura',
        data: font,
        weight: 700,
        style: 'normal',
      }],
    }
  );
}
