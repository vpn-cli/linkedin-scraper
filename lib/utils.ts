/**
 * Extracts the vanity name (public identifier) from a LinkedIn profile URL.
 * 
 * Examples:
 *   https://www.linkedin.com/in/john-doe/            → "john-doe"
 *   https://linkedin.com/in/john-doe?param=value      → "john-doe"
 *   https://www.linkedin.com/in/john-doe              → "john-doe"
 */
export function extractVanityName(url: string): string | null {
  try {
    const parsed = new URL(url);

    // Must be a linkedin.com domain
    const hostname = parsed.hostname.replace('www.', '');
    if (hostname !== 'linkedin.com') {
      return null;
    }

    // Must match /in/<vanityName> pattern
    const match = parsed.pathname.match(/^\/in\/([^\/]+)\/?$/);
    if (!match) {
      return null;
    }

    return match[1];
  } catch {
    return null;
  }
}
