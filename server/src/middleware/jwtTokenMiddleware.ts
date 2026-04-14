import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';

interface JwtGooglePayload {
  email: string;
  username: string;
  googleId: string;
  picture?: string;
  iat: number;
  exp: number;
}

/**
 * Verifies a backend-issued JWT (obtained from POST /api/auth/google).
 * These tokens have a 7-day lifetime and are signed with JWT_SECRET.
 */
export function jwtTokenMiddleware(req: Request, res: Response, next: NextFunction): void {
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
  try {
    const payload = jwt.verify(token, config.JWT_SECRET) as JwtGooglePayload;
    if (!payload.email || !payload.googleId) {
      res.status(401).json({ error: 'Invalid token payload' });
      return;
    }
    req.user = {
      email: payload.email,
      username: payload.username,
      picture: payload.picture,
      googleId: payload.googleId,
    };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}
