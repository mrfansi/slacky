import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Define public routes that don't require authentication
const publicRoutes = [
  '/auth/signin',
  '/auth/signup',
  '/api/auth',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Check if the path is a public route or starts with one
  const isPublicRoute = publicRoutes.some(route => 
    pathname === route || 
    pathname.startsWith(`${route}/`)
  );

  // Allow public routes and static assets
  if (
    isPublicRoute || 
    pathname.startsWith('/_next') || 
    pathname.startsWith('/favicon.ico')
  ) {
    return NextResponse.next();
  }

  // Get the session token
  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
  });

  // If there's no token and the route isn't public, redirect to sign-in
  if (!token) {
    const signInUrl = new URL('/auth/signin', request.url);
    signInUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

// Configure which routes the middleware applies to
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * 1. /_next (Next.js internals)
     * 2. /favicon.ico (favicon file)
     * 3. /api/auth/* (NextAuth.js API routes)
     */
    '/((?!_next|favicon.ico).*)',
  ],
};
