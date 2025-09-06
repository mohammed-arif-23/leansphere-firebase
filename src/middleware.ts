import { NextRequest, NextResponse } from 'next/server';

// Subdomain routing middleware for learn.college.edu and shared auth handling
export function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();
  const host = req.headers.get('host') || '';

  // Extract subdomain (supports localhost with ports and Vercel preview domains)
  // e.g., learn.college.edu, learn.localhost:9002, learn.vercel.app
  const parts = host.split('.');
  const isLocalhost = host.includes('localhost');
  let subdomain = '';

  if (isLocalhost) {
    // For localhost, allow using learn.localhost:port
    if (host.startsWith('learn.')) subdomain = 'learn';
  } else {
    subdomain = parts[0];
  }

  // Shared auth across main and learning subdomains can be achieved via JWT in Authorization header.
  // Here we simply add a hint header and continue. Deep-linking is naturally supported by Next.js routing.
  const res = NextResponse.next();
  if (subdomain === 'learn') {
    res.headers.set('x-subdomain', 'learn');
  }

  return res;
}

export const config = {
  matcher: [
    // Run on all app paths and API routes
    '/((?!_next|static|.*\\.\w+$).*)',
  ],
};
