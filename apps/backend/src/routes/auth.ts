/**
 * Authentication routes
 *
 * MVP Implementation (Phase 1):
 * - POST /api/v1/auth/register (email/password)
 * - POST /api/v1/auth/login (email/password)
 * - POST /api/v1/auth/refresh (JWT refresh token)
 *
 * Phase 2 (Future):
 * - OAuth (Google/Apple)
 * - OTP/MFA
 * - Password reset
 *
 * Latency targets (backend-spec §4.1):
 * - p50 < 120ms, p95 < 300ms, p99 < 800ms
 */

import { Router, Request, Response } from 'express';
import {
  registerUser,
  loginUser,
  issueTokens,
  refreshAccessToken,
  verifyAccessToken,
} from '../services/auth.service';

export const authRouter = Router();

/**
 * POST /api/v1/auth/register
 * Register a new user via email/password
 */
authRouter.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const user = await registerUser(email, password);

    // Set refresh token as httpOnly cookie
    res.cookie('refreshToken', user.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.status(201).json({
      userId: user.id,
      email: user.email,
      accessToken: user.accessToken,
    });
  } catch (error) {
    const message = (error as Error).message;
    const status = message === 'Email already registered' ? 409 : 400;
    res.status(status).json({ error: message });
  }
});

/**
 * POST /api/v1/auth/login
 * Login with email/password
 */
authRouter.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const user = await loginUser(email, password);

    // Set refresh token as httpOnly cookie
    res.cookie('refreshToken', user.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.status(200).json({
      userId: user.id,
      email: user.email,
      accessToken: user.accessToken,
    });
  } catch (error) {
    const message = (error as Error).message;
    res.status(401).json({ error: message });
  }
});

/**
 * POST /api/v1/auth/refresh
 * Refresh access token using refresh token (from httpOnly cookie)
 */
authRouter.post('/refresh', async (req: Request, res: Response) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token required' });
    }

    // Verify and get payload from refresh token
    const payload = verifyAccessToken(refreshToken);

    // Issue new access token
    const newAccessToken = refreshAccessToken(refreshToken);

    res.status(200).json({
      accessToken: newAccessToken,
    });
  } catch (error) {
    const message = (error as Error).message;
    res.status(401).json({ error: message });
  }
});

// ============================================================================
// PHASE 2: OAuth, OTP, Password Reset (Not yet implemented)
// ============================================================================

/**
 * GET /api/v1/auth/oauth/:provider/callback
 * OAuth callback (Google, Apple) - Phase 2
 */
authRouter.get('/oauth/:provider/callback', async (req: Request, res: Response) => {
  res.status(501).json({
    error: 'OAuth not yet implemented',
    message: 'Coming in Phase 2: Google and Apple OAuth support',
  });
});

/**
 * POST /api/v1/auth/otp/request
 * Request an OTP code - Phase 2
 */
authRouter.post('/otp/request', async (req: Request, res: Response) => {
  res.status(501).json({
    error: 'OTP not yet implemented',
    message: 'Coming in Phase 2: Passwordless login and MFA support',
  });
});

/**
 * POST /api/v1/auth/otp/verify
 * Verify an OTP code - Phase 2
 */
authRouter.post('/otp/verify', async (req: Request, res: Response) => {
  res.status(501).json({
    error: 'OTP verification not yet implemented',
    message: 'Coming in Phase 2',
  });
});

/**
 * POST /api/v1/auth/password-reset/request
 * Request a password reset token - Phase 2
 */
authRouter.post('/password-reset/request', async (req: Request, res: Response) => {
  res.status(501).json({
    error: 'Password reset not yet implemented',
    message: 'Coming in Phase 2: Email-based password reset',
  });
});

/**
 * POST /api/v1/auth/password-reset/confirm
 * Confirm password reset - Phase 2
 */
authRouter.post('/password-reset/confirm', async (req: Request, res: Response) => {
  res.status(501).json({
    error: 'Password reset not yet implemented',
    message: 'Coming in Phase 2',
  });
});
