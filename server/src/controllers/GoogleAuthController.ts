import type { Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import logger from '../logger/index.js';
import { config } from '../config.js';

const client = new OAuth2Client(config.GOOGLE_CLIENT_ID);

// 7-day lifetime for issued backend JWTs
const JWT_EXPIRES_IN_SECONDS = 7 * 24 * 60 * 60;

function extractGoogleUser(idToken: string) {
  return client.verifyIdToken({ idToken, audience: config.GOOGLE_CLIENT_ID })
    .then(ticket => {
      const payload = ticket.getPayload();
      if (!payload) throw new Error('Invalid token');
      return {
        email: payload.email!,
        username: payload.name ?? payload.email!,
        picture: payload.picture,
        googleId: payload.sub!,
      };
    });
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export async function googleAuth(req: Request, res: Response) {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      return res.status(400).json({ success: false, error: 'Missing idToken' });
    }
    const user = await extractGoogleUser(idToken);

    // Issue a long-lived backend JWT so the frontend doesn't depend on
    // the 1-hour Google ID token expiry.
    const token = jwt.sign(
      { email: user.email, username: user.username, googleId: user.googleId, picture: user.picture },
      config.JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN_SECONDS },
    );

    return res.status(200).json({ success: true, token, expiresIn: JWT_EXPIRES_IN_SECONDS, user });
  } catch (error) {
    logger.error('Google auth error:', error);
    const errorMsg = error instanceof Error ? error.message : 'Internal server error';
    const status = errorMsg.startsWith('Access is allowed') ? 403 : 401;
    return res.status(status).json({ success: false, error: errorMsg });
  }
}
