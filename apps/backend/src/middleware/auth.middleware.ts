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
 * RBAC middleware factory. Fetches the current user's role from the database
 * (JWT payload does not carry role — roles can change without re-issuing tokens)
 * and enforces membership in allowedRoles. Returns 403 if not authorized.
 *
 * Usage: router.use(requireRole(['admin', 'super_admin']))
 * Must run after authMiddleware (relies on req.user.userId being set).
 */
export function requireRole(allowedRoles: string[]) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { pool } = require('../db');
      const result = await pool.query('SELECT role FROM users WHERE id = $1', [userId]);

      if (result.rows.length === 0) {
        return res.status(401).json({ error: 'User not found' });
      }

      const userRole = result.rows[0].role;

      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      next();
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  };
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
