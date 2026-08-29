# Code Standards

## Server-Side Only Execution
This is an API-only wrapper. There is absolutely NO client-side rendering or React UI required for this project unless explicitly adding a splash page.
- All functional logic resides in `app/api/profile/route.ts` or utility functions in `lib/`.
- Absolutely no `"use client"` directives in the core API logic.

## TypeScript Standards
- Strictly type the incoming Voyager API payload. Use interfaces to map the `$type` references.
- Export interfaces from `types/index.ts` so they can be securely used in `parser.ts`.

## Environment Variable Secrets
- Assume `LINKEDIN_LI_AT` and `LINKEDIN_JSESSIONID` will change often; never hardcode them.
- Throw 500 configuration errors early in the initialization stage if these are missing, to avoid confusing 401s.

## Separation of Concerns
1. Edge logic (Next.js route)
2. Upstream fetch logic (LinkedIn client)
3. Data transformation (Parser)
Keep these separated. Do not parse inside the fetch client.

## Safe Data Mapping
When crawling deeply nested paths in Voyager's output, use optional chaining (`?.`) extensively to prevent `Cannot read properties of undefined` if LinkedIn alters its undocumented return format.
