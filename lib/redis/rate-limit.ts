import { Ratelimit } from '@upstash/ratelimit';
import { redis } from './client';

const WINDOW_SECONDS = parseInt(process.env.RATE_LIMIT_WINDOW_SECONDS || '60', 10);
const MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '5', 10);

export const ratelimit = new Ratelimit({
  redis: redis,
  limiter: Ratelimit.slidingWindow(MAX_REQUESTS, `${WINDOW_SECONDS} s`),
  analytics: true,
});

/**
 * Check if a given IP has exceeded the rate limit.
 * Returns { allowed: true } or { allowed: false }.
 */
export async function checkRateLimit(ip: string): Promise<{ allowed: boolean }> {
  const { success } = await ratelimit.limit(`ratelimit_${ip}`);
  return { allowed: success };
}
