/**
 * Authentication Service
 * Handles user registration, login, JWT token management
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../db';

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'dev-secret-change-me-min-32-chars';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-me-min-32';
const ACCESS_TOKEN_EXPIRES = '15m';
const REFRESH_TOKEN_EXPIRES = '7d';

// Validate JWT secrets in production
if (process.env.NODE_ENV === 'production') {
  if (JWT_ACCESS_SECRET === 'dev-secret-change-me-min-32-chars' ||
      JWT_REFRESH_SECRET === 'dev-refresh-secret-change-me-min-32') {
    throw new Error('FATAL: JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be set in production environment');
  }
}

export interface User {
  id: string;
  email: string;
  password_hash: string;
  created_at: string;
  updated_at: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface AuthPayload {
  userId: string;
  email: string;
}

/**
 * Validate email format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Register a new user with email/password
 */
export async function registerUser(email: string, password: string): Promise<User & TokenPair> {
  const client = await pool.connect();

  try {
    // Validate input
    if (!email || !password) {
      throw new Error('Email and password required');
    }

    if (!isValidEmail(email)) {
      throw new Error('Invalid email format');
    }

    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters');
    }

    // Check if user already exists
    const existingUser = await client.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      throw new Error('Email already registered');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const result = await client.query(
      `INSERT INTO users (email, password_hash, preferred_currency, timezone, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       RETURNING id, email, password_hash, created_at, updated_at`,
      [email, passwordHash, 'USD', 'UTC']
    );

    const user = result.rows[0];

    // Issue tokens
    const tokens = issueTokens({ userId: user.id, email: user.email });

    // Audit log
    await client.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, diff)
       VALUES ($1, $2, $3, $4, $5)`,
      [user.id, 'create', 'user', user.id, JSON.stringify({ email })]
    );

    return {
      ...user,
      ...tokens,
    };
  } finally {
    client.release();
  }
}

/**
 * Login with email/password
 */
export async function loginUser(email: string, password: string): Promise<User & TokenPair> {
  const client = await pool.connect();

  try {
    // Validate input
    if (!email || !password) {
      throw new Error('Invalid credentials');
    }

    // Lookup user
    const result = await client.query(
      'SELECT id, email, password_hash, created_at, updated_at FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      throw new Error('Invalid credentials');
    }

    const user = result.rows[0];

    // Compare password
    const passwordMatches = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatches) {
      // Audit log: failed login attempt (system-initiated, no user_id)
      await client.query(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, diff)
         VALUES (NULL, $1, $2, $3, $4)`,
        ['update', 'user', user.id, JSON.stringify({ event: 'login_failed', email })]
      );
      throw new Error('Invalid credentials');
    }

    // Issue tokens
    const tokens = issueTokens({ userId: user.id, email: user.email });

    // Audit log: successful login (update action for login event)
    await client.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, diff)
       VALUES ($1, $2, $3, $4, $5)`,
      [user.id, 'update', 'user', user.id, JSON.stringify({ event: 'login_success' })]
    );

    return {
      ...user,
      ...tokens,
    };
  } finally {
    client.release();
  }
}

/**
 * Issue JWT access and refresh tokens
 */
export function issueTokens(payload: AuthPayload): TokenPair {
  const accessToken = jwt.sign(payload, JWT_ACCESS_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRES,
  });

  const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRES,
  });

  return { accessToken, refreshToken };
}

/**
 * Verify and refresh access token using refresh token
 */
export function refreshAccessToken(refreshToken: string): string {
  try {
    const payload = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as AuthPayload;
    return jwt.sign(payload, JWT_ACCESS_SECRET, {
      expiresIn: ACCESS_TOKEN_EXPIRES,
    });
  } catch (error) {
    throw new Error('Invalid or expired refresh token');
  }
}

/**
 * Verify JWT access token
 */
export function verifyAccessToken(token: string): AuthPayload {
  try {
    return jwt.verify(token, JWT_ACCESS_SECRET) as AuthPayload;
  } catch (error) {
    throw new Error('Invalid or expired access token');
  }
}
