import { redis } from './client';

const CACHE_TTL = parseInt(process.env.CACHE_TTL_SECONDS || '1800', 10);

/**
 * Retrieve a cached profile response from Redis.
 * Returns parsed JSON if found, null otherwise.
 */
export async function getCachedProfile(identifier: string): Promise<any | null> {
  const cacheKey = `linkedin:profile:${identifier}`;
  const cached = await redis.get<string>(cacheKey);

  if (cached) {
    console.log(`[Cache Hit] ${identifier}`);
    return typeof cached === 'string' ? JSON.parse(cached) : cached;
  }

  return null;
}

/**
 * Store a profile response in Redis with a configurable TTL.
 */
export async function setCachedProfile(identifier: string, data: any): Promise<void> {
  const cacheKey = `linkedin:profile:${identifier}`;
  await redis.set(cacheKey, JSON.stringify(data), { ex: CACHE_TTL });
  console.log(`[Cache Set] ${identifier} (TTL: ${CACHE_TTL}s)`);
}
