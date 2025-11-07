/**
 * Next.js Middleware for API Authentication
 *
 * Protects ACP endpoints with Bearer token authentication
 */

import { NextRequest, NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Protect /api/checkouts/* and /api/feed/* endpoints
  if (pathname.startsWith('/api/checkouts') || pathname.startsWith('/api/feed')) {
    const authHeader = req.headers.get('authorization');

    // Check for Bearer token
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: { type: 'invalid_request', code: 'missing_auth', message: 'Authorization header required' } },
        { status: 401 }
      );
    }

    // Extract and validate token
    const token = authHeader.substring(7);
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      console.error('OPENAI_API_KEY not configured');
      return NextResponse.json(
        { error: { type: 'invalid_request', code: 'internal_error', message: 'Server misconfigured' } },
        { status: 500 }
      );
    }

    if (token !== apiKey) {
      return NextResponse.json(
        { error: { type: 'invalid_request', code: 'invalid_auth', message: 'Invalid API key' } },
        { status: 403 }
      );
    }
  }

  // Allow request to proceed
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/api/checkouts/:path*',
    '/api/feed/:path*'
  ]
};
