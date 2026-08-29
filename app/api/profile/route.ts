import { NextResponse } from 'next/server';
import { extractVanityName } from '@/lib/utils';
import { getCachedProfile, setCachedProfile } from '@/lib/redis/cache';
import { checkRateLimit } from '@/lib/redis/rate-limit';
import { LinkedInClient } from '@/lib/linkedin/client';
import { parseProfileResponse } from '@/lib/linkedin/parser';

export async function POST(request: Request) {
  try {
    // 1. Parse request body
    const body = await request.json();
    const { url } = body;

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'missing_url', message: 'Request body must include a "url" field.' },
        { status: 400 }
      );
    }

    // 2. Validate and extract vanity name
    const vanityName = extractVanityName(url);
    if (!vanityName) {
      return NextResponse.json(
        { error: 'invalid_url', message: 'URL must be a valid LinkedIn profile URL (e.g., https://linkedin.com/in/username).' },
        { status: 400 }
      );
    }

    // 3. Rate limiting
    if (process.env.UPSTASH_REDIS_REST_URL) {
      const ip = request.headers.get('x-forwarded-for') ?? '127.0.0.1';
      const { allowed } = await checkRateLimit(ip);
      if (!allowed) {
        return NextResponse.json(
          { error: 'rate_limit_exceeded', message: 'Too many requests. Please try again later.' },
          { status: 429 }
        );
      }
    }

    // 4. Cache check
    if (process.env.UPSTASH_REDIS_REST_URL) {
      const cached = await getCachedProfile(vanityName);
      if (cached) {
        return NextResponse.json(cached, { status: 200 });
      }
    }

    // 5. Fetch from LinkedIn
    const profileUrl = url;
    const client = new LinkedInClient();
    const rawResponses = await client.fetchProfile(vanityName, profileUrl);

    // 6. Parse response
    const profileData = parseProfileResponse(rawResponses);

    // 7. Cache the result
    if (process.env.UPSTASH_REDIS_REST_URL) {
      await setCachedProfile(vanityName, profileData);
    }

    // 8. Return
    return NextResponse.json(profileData, { status: 200 });

  } catch (error: any) {
    console.error('[API Error]', error.message || error);

    // Map known error patterns to appropriate HTTP status codes
    if (error.message?.includes('not implemented')) {
      return NextResponse.json(
        { error: 'not_implemented', message: 'LinkedIn client/parser not yet implemented.' },
        { status: 501 }
      );
    }

    if (error.message?.includes('401') || error.message?.includes('session')) {
      return NextResponse.json(
        { error: 'auth_failure', message: 'LinkedIn session expired or invalid.' },
        { status: 401 }
      );
    }

    if (error.message?.includes('404') || error.message?.includes('not found')) {
      return NextResponse.json(
        { error: 'profile_not_found', message: 'Profile not found or inaccessible.' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'internal_error', message: 'An unexpected error occurred.' },
      { status: 500 }
    );
  }
}

// Health check
export async function GET() {
  return NextResponse.json({ status: 'ok' });
}
