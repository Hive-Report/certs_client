import type { Request, Response, NextFunction } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { config } from '../config.js';

// Розширюємо тип Request для user
declare global {
  namespace Express {
    interface Request {
      user?: {
        email: string;
        username: string;
        picture?: string;
        googleId: string;
      };
    }
  }
}

const client = new OAuth2Client(config.GOOGLE_CLIENT_ID);

export async function googleTokenMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
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
    const ticket = await client.verifyIdToken({ idToken: token, audience: config.GOOGLE_CLIENT_ID });
    const payload = ticket.getPayload();
    if (!payload) {
      res.status(401).json({ error: 'Invalid Google token' });
      return;
    }
    // Перевіряємо домен
    const allowedDomains = (config.ALLOWED_EMAIL_DOMAINS || '').split(',').map(d => d.trim()).filter(Boolean);
    if (!payload.hd || !allowedDomains.includes(payload.hd)) {
      res.status(403).json({ error: 'Доступ дозволено лише для доменів: ' + allowedDomains.join(', ') });
      return;
    }
    // Перевіряємо обов'язкові поля
    if (!payload.email || !payload.sub) {
      res.status(401).json({ error: 'Google token missing required fields' });
      return;
    }
    // Додаємо користувача до req
    req.user = {       
      email: payload.email,       
      username: payload.name ?? payload.email,
      picture: payload.picture,
      googleId: payload.sub,
    };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired Google token' });
  }
}
