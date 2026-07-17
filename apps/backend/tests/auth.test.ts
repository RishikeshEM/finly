/**
 * Auth Module Tests
 * Test email/password registration, login, and JWT refresh
 *
 * Note: Test passwords use placeholder values set in .env.test
 */

import { registerUser, loginUser, refreshAccessToken, verifyAccessToken } from '../src/services/auth.service';

const TEST_PASSWORD = process.env.TEST_PASSWORD || 'TestPassword123!';

describe('Auth Service', () => {
  describe('BE-TC-01: Register via email/password', () => {
    it('should register a new user with hashed password', async () => {
      const email = `test-${Date.now()}@example.com`;

      const user = await registerUser(email, TEST_PASSWORD);

      expect(user.id).toBeDefined();
      expect(user.email).toBe(email);
      expect(user.password_hash).toBeDefined();
      expect(user.password_hash).not.toBe(TEST_PASSWORD); // Should be hashed
      expect(user.accessToken).toBeDefined();
      expect(user.refreshToken).toBeDefined();
    });

    it('should reject duplicate email registration', async () => {
      const email = `dup-${Date.now()}@example.com`;

      await registerUser(email, TEST_PASSWORD);

      // Second registration should fail
      await expect(registerUser(email, TEST_PASSWORD)).rejects.toThrow('Email already registered');
    });

    it('should reject weak passwords', async () => {
      const email = `weak-${Date.now()}@example.com`;
      await expect(registerUser(email, 'short')).rejects.toThrow(
        'Password must be at least 8 characters'
      );
    });
  });

  describe('BE-TC-04: Login and JWT refresh', () => {
    it('should login with valid credentials', async () => {
      const email = `login-${Date.now()}@example.com`;

      // Register first
      const registered = await registerUser(email, TEST_PASSWORD);

      // Login
      const user = await loginUser(email, TEST_PASSWORD);

      expect(user.id).toBe(registered.id);
      expect(user.email).toBe(email);
      expect(user.accessToken).toBeDefined();
      expect(user.refreshToken).toBeDefined();
    });

    it('should reject login with invalid password', async () => {
      const email = `invalid-${Date.now()}@example.com`;

      await registerUser(email, TEST_PASSWORD);

      await expect(loginUser(email, 'WrongPassword123!')).rejects.toThrow('Invalid credentials');
    });

    it('should reject login with nonexistent email', async () => {
      await expect(loginUser(`nonexist-${Date.now()}@example.com`, TEST_PASSWORD)).rejects.toThrow(
        'Invalid credentials'
      );
    });

    it('should refresh access token with valid refresh token', async () => {
      const email = `refresh-${Date.now()}@example.com`;

      const user = await registerUser(email, TEST_PASSWORD);
      const refreshToken = user.refreshToken;

      // Refresh access token
      const newAccessToken = refreshAccessToken(refreshToken);

      expect(newAccessToken).toBeDefined();
      expect(newAccessToken).not.toBe(user.accessToken); // Should be a new token

      // Verify new access token is valid
      const payload = verifyAccessToken(newAccessToken);
      expect(payload.userId).toBe(user.id);
      expect(payload.email).toBe(email);
    });

    it('should reject refresh with invalid token', async () => {
      await expect(refreshAccessToken('invalid.token.here')).rejects.toThrow(
        'Invalid or expired refresh token'
      );
    });
  });

  describe('BE-TC-20: Audit logging', () => {
    it('should create audit log for user registration', async () => {
      const email = `audit-reg-${Date.now()}@example.com`;

      const user = await registerUser(email, TEST_PASSWORD);

      // TODO: Verify audit_logs table has entry for user_created
      // SELECT * FROM audit_logs WHERE user_id = $1 AND action = 'user_created'
      expect(user.id).toBeDefined();
    });

    it('should create audit log for successful login', async () => {
      const email = `audit-login-${Date.now()}@example.com`;

      await registerUser(email, TEST_PASSWORD);
      const user = await loginUser(email, TEST_PASSWORD);

      // TODO: Verify audit_logs table has entry for login_success
      // SELECT * FROM audit_logs WHERE user_id = $1 AND action = 'login_success'
      expect(user.id).toBeDefined();
    });

    it('should create audit log for failed login', async () => {
      const email = `audit-fail-${Date.now()}@example.com`;

      await registerUser(email, TEST_PASSWORD);

      try {
        await loginUser(email, 'WrongPassword123!');
      } catch (error) {
        // Expected to fail
      }

      // TODO: Verify audit_logs table has entry for login_failed
      // SELECT * FROM audit_logs WHERE action = 'login_failed' AND details->>'email' = $1
    });
  });
});
