import { NextRequest } from 'next/server';

/**
 * Simple bearer token authentication
 * Checks Authorization: Bearer {API_BEARER} header
 */
export function requireBearer(req: NextRequest): { authorized: boolean; error?: string } {
  const authHeader = req.headers.get('authorization');
  const expectedToken = process.env.API_BEARER || 'dev_token_123';

  if (!authHeader) {
    return { authorized: false, error: 'Missing authorization header' };
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return { authorized: false, error: 'Invalid authorization format. Expected: Bearer <token>' };
  }

  const token = parts[1];
  if (token !== expectedToken) {
    return { authorized: false, error: 'Invalid bearer token' };
  }

  return { authorized: true };
}
