/**
 * Authentication middleware
 * Verifies JWT access tokens and attaches user to request
 */

import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../services/auth.service';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
  };
}

/**
 * Verify JWT access token from Authorization header
 * Usage: app.use('/api/v1/protected', authMiddleware)
 */
export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.substring(7); // Remove "Bearer "
    const payload = verifyAccessToken(token);

    req.user = {
      userId: payload.userId,
      email: payload.email,
    };

    next();
  } catch (error) {
    const message = (error as Error).message;
    res.status(401).json({ error: message });
  }
}

/**
 * Optional auth middleware - doesn't fail if token is missing, but verifies if present
 */
export function optionalAuthMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const payload = verifyAccessToken(token);

      req.user = {
        userId: payload.userId,
        email: payload.email,
      };
    }

    next();
  } catch (error) {
    // Log but don't fail on optional auth
    console.warn('Invalid token in optional auth:', (error as Error).message);
    next();
  }
}
