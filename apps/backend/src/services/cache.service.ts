/**
 * Cache invalidation service
 * Invalidates dashboard cache on any write to transactions/budgets/goals (backend-spec §2.3)
 */

import { createClient } from 'redis';

const redisClient = createClient({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  socket: { reconnectStrategy: () => 5000 },
});

redisClient.on('error', (err) => {
  console.warn('Redis client error in cache service:', err.message);
});

/**
 * Invalidate dashboard cache for a user after a write to transactions/budgets/goals.
 * Non-blocking: failure to invalidate does not fail the write operation.
 */
export async function invalidateDashboardCache(userId: string): Promise<void> {
  try {
    await redisClient.del(`dashboard:${userId}`);
  } catch (error) {
    console.warn(`Failed to invalidate dashboard cache for ${userId}:`, (error as Error).message);
  }
}

export async function getIdempotentResourceId(scope: string, key: string): Promise<string | null> {
  try {
    return await redisClient.get(`idempotency:${scope}:${key}`);
  } catch (error) {
    console.warn(`Idempotency lookup failed for ${scope}:${key}:`, (error as Error).message);
    return null;
  }
}

export async function setIdempotentResourceId(scope: string, key: string, resourceId: string, ttlSeconds = 86400): Promise<void> {
  try {
    await redisClient.setEx(`idempotency:${scope}:${key}`, ttlSeconds, resourceId);
  } catch (error) {
    console.warn(`Idempotency store failed for ${scope}:${key}:`, (error as Error).message);
  }
}
