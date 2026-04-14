import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { config } from '../config.js';

/**
 * Backward-compatible auth middleware.
 *
 * Accepts two token types in the Authorization: Bearer <token> header:
 *   1. Backend JWT  – issued by POST /api/auth/google, 7-day lifetime.
 *                     Verified locally with JWT_SECRET (fast, no Google round-trip).
 *   2. Google ID Token – the raw credential returned by the Google Sign-In SDK.
 *                        Verified with Google's public keys (existing behaviour).
 *
 * This lets the browser frontend use long-lived backend JWTs while any
 * server-to-server or legacy clients that still send Google ID tokens
 * continue to work without changes.
 */

interface JwtGooglePayload {
  email: string;
  username: string;
  googleId: string;
  picture?: string;
}

const googleClient = new OAuth2Client(config.GOOGLE_CLIENT_ID);

export async function combinedAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authorization header missing or invalid' });
    return;
  }

  const token = authHeader.substring(7).trim();
  if (!token) {
    res.status(401).json({ error: 'Token is empty' });
    return;
  }

  // ── Attempt 1: backend JWT ────────────────────────────────────────────────
  try {
    const payload = jwt.verify(token, config.JWT_SECRET) as JwtGooglePayload;
    if (payload.email && payload.googleId) {
      req.user = {
        email: payload.email,
        username: payload.username,
        picture: payload.picture,
        googleId: payload.googleId,
      };
      next();
      return;
    }
  } catch {
    // Not a valid backend JWT – fall through to Google ID token verification.
  }

  // ── Attempt 2: Google ID token (legacy / server-to-server clients) ────────
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: config.GOOGLE_CLIENT_ID,
    });
    const googlePayload = ticket.getPayload();
    if (!googlePayload?.email || !googlePayload?.sub) {
      res.status(401).json({ error: 'Invalid Google token' });
      return;
    }
    req.user = {
      email: googlePayload.email,
      username: googlePayload.name ?? googlePayload.email,
      picture: googlePayload.picture,
      googleId: googlePayload.sub,
    };
    next();
    return;
  } catch {
    // Neither token type was valid.
  }

  res.status(401).json({ error: 'Invalid or expired token' });
}
