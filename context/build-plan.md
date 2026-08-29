# Build Plan

## Core Principle
Build the scraper in distinct, testable layers. First ensure we can extract the identifier from a URL. Second, ensure we can make an authenticated request. Third, write the complex parsing logic. Finally, wrap it in Next.js caching and rate limiting.

---

## Phase 1 — Core Core Utilities

### 01 Environment & Boilerplate
- Scaffold the Next.js API route architecture.
- Setup `.env.local` to securely house `LINKEDIN_LI_AT`, `LINKEDIN_JSESSIONID`, AND Upstash configs.

### 02 URL Parser Engine
- Build robust logic to parse LinkedIn URLs.
- E.g., `https://www.linkedin.com/in/john-doe/?isSelfProfile=false` -> returns `john-doe` cleanly, ignoring queries and trailing slashes.

---

## Phase 2 — Upstream Integration

### 03 Linkerdin Voyager Client 
- Implement authenticated fetch utility pointing to `/voyager/api/identity/profiles/{publicIdentifier}/profileView`.
- Correctly attach the `Cookie` string and `csrf-token` headers matching `JSESSIONID`.

---

## Phase 3 — Data Transformation

### 04 Schema Design
- Define TypeScript interfaces mapping cleanly to what the client expects (Profile, name, experience array, education array, skills).

### 05 Voyager Parser
- Loop through the massive Voyager `included` array.
- Identify and map entities using their specific `$type` strings:
   - `com.linkedin.voyager.dash.identity.profile.Profile`
   - `com.linkedin.voyager.dash.identity.profile.Position`
   - `com.linkedin.voyager.dash.identity.profile.Education`
   - `com.linkedin.voyager.dash.identity.profile.Skill`
   - `com.linkedin.voyager.dash.identity.profile.Certification`

---

## Phase 4 — API Edge Defenses

### 06 Next.js Endpoint
- Wire up the `GET /api/profile` route combining the URL Parser, LinkedIn Client, and Parser Engine.

### 07 Rate Limiter (Upstash)
- Implement sliding window rate limit per IP using `@upstash/ratelimit`. Stop excess traffic with HTTP 429.

### 08 Data Cache (Upstash)
- Implement cache reading before upstream calls, and cache writing after successful parses. Return instantly bypassing LinkedIn on subsequent requests.

---

## Phase 5 — Validation

### 09 Error Handling & Edge Cases
- Ensure 4xx and 5xx errors from LinkedIn gracefully return as appropriate 4xx/5xx API responses.
- Test private profiles.
- Test expired cookie handlers (returning a nice 401 message).
