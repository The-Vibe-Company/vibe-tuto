import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const title = request.nextUrl.searchParams.get('title') || 'CapTuto tutorial';
  const steps = request.nextUrl.searchParams.get('steps');

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#f8fafc',
          color: '#1c1917',
          padding: 72,
          fontFamily: 'Inter, Arial, sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 18,
            fontSize: 30,
            fontWeight: 700,
          }}
        >
          <div
            style={{
              width: 58,
              height: 58,
              borderRadius: 16,
              background: '#4f46e5',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                width: 0,
                height: 0,
                borderTop: '12px solid transparent',
                borderBottom: '12px solid transparent',
                borderLeft: '18px solid white',
                marginLeft: 4,
              }}
            />
          </div>
          CapTuto
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div
            style={{
              width: 118,
              height: 36,
              borderRadius: 999,
              background: '#e0e7ff',
              color: '#4338ca',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
              fontWeight: 700,
            }}
          >
            Tutorial
          </div>
          <div
            style={{
              maxWidth: 920,
              fontSize: title.length > 54 ? 58 : 70,
              lineHeight: 1.05,
              fontWeight: 800,
              letterSpacing: 0,
            }}
          >
            {title}
          </div>
          <div style={{ display: 'flex', gap: 16, color: '#57534e', fontSize: 26 }}>
            <span>Step-by-step guide</span>
            {steps ? <span>/ {steps} steps</span> : null}
          </div>
        </div>

        <div
          style={{
            height: 8,
            width: '100%',
            borderRadius: 999,
            background: 'linear-gradient(90deg, #4f46e5, #7c3aed, #10b981)',
          }}
        />
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
