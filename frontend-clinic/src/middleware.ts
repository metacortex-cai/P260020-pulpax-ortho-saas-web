import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Paths that are publicly accessible without an auth cookie.
 * /select-clinic is post-login but guarded by its own useEffect;
 * keeping it public here avoids any race after the backend redirect.
 */
const PUBLIC_PATHS = ['/login', '/select-clinic'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // --- Nonce-based Content Security Policy ---
  // A fresh cryptographic nonce is generated for every request.
  // This replaces the static 'unsafe-inline' directive in script-src,
  // making CSP effective against XSS injection.
  //
  // Server Components can read the nonce via the forwarded `x-nonce`
  // request header (call `headers()` from `next/headers`) and pass it
  // to <Script nonce={nonce}> or inline <script nonce={nonce}> tags.
  //
  // NOTE: 'unsafe-eval' is retained because Next.js / Turbopack / React
  // DevTools require eval() during development. It is safe to remove it
  // in a production-only build where you control the bundler output.
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');

  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'unsafe-eval'`,
    // style-src keeps 'unsafe-inline': inline styles are far lower risk
    // than inline scripts, and Next.js / CSS-in-JS emit them heavily.
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https:",
    "connect-src 'self' https://localhost:7110 https://localhost:7101 wss://localhost:7101 http://localhost:7110 http://localhost:7101 ws://localhost:7101",
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests",
  ].join('; ');

  // Clone request headers so we can forward the nonce to Server Components.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);

  // Allow public paths (exact match or sub-paths)
  const isPublic = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + '/')
  );

  if (!isPublic) {
    // The backend sets an HttpOnly "access_token" cookie on login.
    // Middleware can read it; no JWT decoding needed here — the backend
    // will reject stale/invalid tokens on actual API calls.
    const accessToken = request.cookies.get('access_token');

    if (!accessToken) {
      const loginUrl = new URL('/login', request.url);
      const redirectResponse = NextResponse.redirect(loginUrl);
      // Still set CSP on the redirect response so the browser enforces
      // policy even on the brief redirect hop.
      redirectResponse.headers.set('Content-Security-Policy', csp);
      return redirectResponse;
    }
  }

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  response.headers.set('Content-Security-Policy', csp);

  return response;
}

export const config = {
  matcher: [
    /*
     * Run on all routes EXCEPT:
     *  - _next/static  (Next.js bundled assets)
     *  - _next/image   (Next.js image optimisation)
     *  - favicon.ico
     *  - api/*         (API routes handled server-side)
     *  - Files with common static extensions (images, fonts, css, js…)
     */
    '/((?!_next/static|_next/image|favicon\\.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf|eot|map)$).*)',
  ],
};
