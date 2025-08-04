import type { Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import logger from '../logger/index.js';
import { config } from '../config.js';

const client = new OAuth2Client(config.GOOGLE_CLIENT_ID);

function extractGoogleUser(idToken: string) {
  return client.verifyIdToken({ idToken, audience: config.GOOGLE_CLIENT_ID })
    .then(ticket => {
      const payload = ticket.getPayload();
      if (!payload) throw new Error('Invalid token');
      return {
        email: payload.email,
        username: payload.name ?? payload.email,
        picture: payload.picture,
        googleId: payload.sub,
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
    return res.status(200).json({ success: true, user });
  } catch (error) {
    logger.error('Google auth error:', error);
    const errorMsg = error instanceof Error ? error.message : 'Internal server error';
    const status = errorMsg.startsWith('Access is allowed') ? 403 : 401;
    return res.status(status).json({ success: false, error: errorMsg });
  }
}
