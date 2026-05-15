import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import type { AuthPayload } from '@/types';

const COOKIE = 'gp_att_token';

function getJwtSecret(): string {
  // Primary secret from environment. In development we fall back to a hard‑coded secret so that the app can start even if the .env file is missing or has been changed.
  const secret = process.env.JWT_SECRET ?? 'fallback-secret-for-dev';
  if (!process.env.JWT_SECRET) {
    console.warn('[Auth] JWT_SECRET not set in environment – using fallback secret. This should only happen in development.');
  }
  return secret;
}

export function signToken(payload: object) {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: '7d' });
}

export function verifyToken(token: string): AuthPayload | null {
  try { return jwt.verify(token, getJwtSecret()) as AuthPayload; }
  catch { return null; }
}

import { cache } from 'react';

export const getAuthUser = cache(async (): Promise<AuthPayload | null> => {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE)?.value;
    if (!token) return null;
    return verifyToken(token);
  } catch { return null; }
});

export const COOKIE_NAME = COOKIE;
export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 60 * 60 * 24 * 7,
  path: '/',
};
