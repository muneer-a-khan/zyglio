import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
  // Get the pathname
  const path = request.nextUrl.pathname;
  
  // Clone the response
  const response = NextResponse.next();
  
  // Set security headers
  const headersList = {
    // Add Permissions-Policy header to allow microphone use
    'Permissions-Policy': 'microphone=*, camera=*',
    // Improve security with these headers
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-XSS-Protection': '1; mode=block'
  };
  
  // Apply all headers
  Object.entries(headersList).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}

// Match all request paths except for API routes, static files, images, etc.
export const config = {
  matcher: [
    // Match all paths except for these
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}; 