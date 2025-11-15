import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Next.js Middleware for AI-powered payment negotiation
 * Intercepts crawl requests and initiates negotiation flow
 */
export function middleware(request: NextRequest) {
  // Only intercept API routes that should trigger negotiation
  const path = request.nextUrl.pathname;

  // Example: Intercept specific crawl endpoints
  if (path.startsWith('/api/external-crawl')) {
    // Check if payment negotiation is required
    const requiresPayment = true; // In real implementation, check request characteristics

    if (requiresPayment) {
      // Check for payment headers (x402 protocol)
      const paymentHeader = request.headers.get('X-Payment-Transaction');

      if (!paymentHeader) {
        // No payment - initiate negotiation
        return NextResponse.json(
          {
            error: 'Payment required',
            message: 'This resource requires payment negotiation',
            negotiationEndpoint: '/api/negotiate',
          },
          {
            status: 402, // Payment Required
            headers: {
              'X-Payment-Required': '402',
              'X-Negotiation-Endpoint': '/api/negotiate',
            },
          }
        );
      }

      // Verify payment (simplified)
      // In real implementation, verify signature and transaction
    }
  }

  // Continue with the request
  return NextResponse.next();
}

// Configure which routes the middleware should run on
export const config = {
  matcher: [
    '/api/external-crawl/:path*',
    // Add other routes that should trigger negotiation
  ],
};
