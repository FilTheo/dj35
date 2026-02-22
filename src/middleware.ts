import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only protect /api/* routes (except /api/auth)
  if (!pathname.startsWith('/api/') || pathname === '/api/auth') {
    return NextResponse.next();
  }

  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = authHeader.slice(7);

  // Validate token structure and HMAC signature
  // We can't use Node crypto in Edge middleware, so we do basic structural
  // validation here and full HMAC check in the auth helper.
  // For Edge runtime, we use the Web Crypto API.
  const parts = token.split('.');
  if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check token expiry (24 hours)
  const timestamp = parseInt(parts[1], 10);
  if (isNaN(timestamp) || Date.now() - timestamp > 24 * 60 * 60 * 1000) {
    return NextResponse.json({ error: 'Token expired' }, { status: 401 });
  }

  // Full HMAC verification using Web Crypto API
  const payload = `${parts[0]}.${parts[1]}`;
  const signature = parts[2];
  const secret = process.env.APP_SECRET_TOKEN;

  if (!secret) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  // We need to verify the HMAC asynchronously, but middleware must be sync-ish.
  // Use a helper approach: encode and verify with Web Crypto.
  return verifyHmac(payload, signature, secret).then((valid) => {
    if (!valid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.next();
  });
}

async function verifyHmac(payload: string, signature: string, secret: string): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
    const expected = Array.from(new Uint8Array(sig))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    // Constant-time comparison
    if (signature.length !== expected.length) return false;
    let mismatch = 0;
    for (let i = 0; i < signature.length; i++) {
      mismatch |= signature.charCodeAt(i) ^ expected.charCodeAt(i);
    }
    return mismatch === 0;
  } catch {
    return false;
  }
}

export const config = {
  matcher: '/api/:path*',
};
