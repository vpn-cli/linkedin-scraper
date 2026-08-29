# LinkedIn Profile Extraction API — Implementation Plan

## 1. Objective

Build a publicly hosted Node.js API that accepts a LinkedIn profile URL and returns a normalized structured JSON representation of the profile.

Example request:

```http
POST /api/profile
Content-Type: application/json

{
  "url": "https://www.linkedin.com/in/<vanityName>/"
}
```

Example response:

```json
{
  "profile": {
    "name": "",
    "headline": "",
    "location": "",
    "about": "",
    "profileImage": "",
    "backgroundImage": ""
  },
  "experience": [],
  "education": [],
  "skills": [],
  "certifications": [],
  "languages": [],
  "featured": [],
  "services": []
}
```

The implementation must work from the profile URL without requiring a browser automation session.

---

# 2. Architecture

Use:

```text
Client
   │
   ▼
Node.js + Express API
   │
   ├── URL validation
   ├── Rate limiting
   ├── Redis cache
   │
   ▼
LinkedIn HTTP Client
   │
   ├── authenticated session
   ├── HAR-derived requests
   └── request/response handling
   │
   ▼
RSC/SDUI Parser
   │
   ├── component discovery
   ├── text/entity extraction
   ├── image extraction
   └── semantic field mapping
   │
   ▼
Profile Normalizer
   │
   ▼
Redis cache
   │
   ▼
JSON response
```

Use Redis for both:

1. API rate limiting.
2. Profile response caching.

Deploy the Node.js application on Railway.

---

# 3. Repository structure

Create:

```text
linkedin-profile-api/
├── src/
│   ├── server.js
│   ├── app.js
│   │
│   ├── routes/
│   │   └── profile.js
│   │
│   ├── linkedin/
│   │   ├── client.js
│   │   ├── requests.js
│   │   └── components.js
│   │
│   ├── parser/
│   │   ├── rscParser.js
│   │   ├── componentParser.js
│   │   └── profileNormalizer.js
│   │
│   ├── cache/
│   │   └── redis.js
│   │
│   └── middleware/
│       ├── rateLimiter.js
│       └── errorHandler.js
│
├── scripts/
│   └── test-linkedin-request.js
│
├── package.json
├── .env.example
├── .gitignore
├── Dockerfile
├── docker-compose.yml
└── README.md
```

Keep responsibilities separated. Do not put LinkedIn request logic, parsing, caching, and HTTP routing into one file.

---

# 4. Environment variables

Use environment variables only.

```env
PORT=3000

LINKEDIN_LI_AT=
LINKEDIN_JSESSIONID=

REDIS_URL=

CACHE_TTL_SECONDS=1800
RATE_LIMIT_WINDOW_SECONDS=60
RATE_LIMIT_MAX_REQUESTS=5
```

Never hard-code LinkedIn cookies.

Never expose them through the API.

Never commit `.env`.

Provide `.env.example` containing variable names but no credentials.

---

# 5. LinkedIn authentication

Use the authenticated session belonging to the dedicated test/mock LinkedIn account.

The server should construct the appropriate authenticated request using the configured session cookies.

Initially support:

```text
li_at
JSESSIONID
```

and any additional headers proven necessary from the HAR.

Do NOT implement LinkedIn username/password login.

Do NOT accept LinkedIn credentials from API callers.

The API caller supplies only the LinkedIn profile URL.

---

# 6. HAR-driven request reverse engineering

Two HAR captures are available:

```text
before scroll
after scroll
```

The important observation is that the initial page does not request all profile sections.

The after-scroll capture contains additional requests including:

```text
profileCardsExperienceOnly
profileCardsBelowActivityPart1WithoutExp
profileCardsBelowActivityPart2
profileCardsBelowActivityPart3
profileCardsBelowActivityPart4
profileCardsBelowActivityPart5
profileCardsBelowActivityPart6
profileCardsBelowActivityPart7
```

Therefore, do NOT assume that the initial profile request contains the complete profile.

The implementation must reproduce the HTTP requests that the LinkedIn frontend makes for the required profile components.

Before writing generalized request logic, inspect the HAR and determine for each relevant request:

```text
HTTP method
URL
query parameters
request body
required headers
required cookies
response content type
response structure
```

Do not blindly copy every browser header. Determine which are actually required.

---

# 7. First milestone — prove direct HTTP extraction

Before implementing the complete API, create:

```text
scripts/test-linkedin-request.js
```

Its only responsibility is to reproduce the request for:

```text
profileCardsExperienceOnly
```

using the environment credentials.

Expected workflow:

```text
Node script
   ↓
authenticated LinkedIn request
   ↓
response
   ↓
save/print response
```

Success criterion:

The Node request receives the same useful profile-component response that the browser received in the HAR.

Do not proceed to the complete parser until this works.

---

# 8. RSC/SDUI parser

LinkedIn responses are not conventional REST JSON objects.

Responses may contain structures such as:

```text
"$"
"$L4"
"$L17"
"$undefined"
componentKey
children
props
triggers
```

The parser must therefore treat the response as an RSC/SDUI payload.

Create a generic parser capable of:

* locating component objects
* traversing nested `children`
* extracting text
* extracting links
* extracting image references
* extracting entity URNs
* identifying component keys
* handling nested component references
* ignoring tracking/observability metadata
* ignoring presentation-only CSS/class information

Do not make the parser dependent on CSS class names.

Do not hard-code the test user's name or profile URL.

---

# 9. Semantic extraction

Create a normalization layer that maps raw LinkedIn component data into the API schema.

Target fields:

```text
profile.name
profile.headline
profile.location
profile.about
profile.profileImage
profile.backgroundImage

experience[]
education[]
skills[]
certifications[]
languages[]
featured[]
services[]
```

Each extraction should be independent.

If one section cannot be extracted, do not destroy the entire response.

For example:

```json
{
  "profile": {
    "name": "Example",
    "headline": "Software Engineer"
  },
  "experience": [],
  "education": [],
  "skills": [],
  "certifications": null,
  "languages": [],
  "errors": [
    {
      "field": "certifications",
      "reason": "component_unavailable"
    }
  ]
}
```

---

# 10. Required component mapping

Initially investigate and map:

```text
profileCardsAboveActivity
    → About
    → Featured
    → Services
    → other above-activity profile cards

profileCardsExperienceOnly
    → Experience

profileCardsBelowActivityPart*
    → Education / Skills / Certifications / Languages / other profile sections
```

Do not assume which `BelowActivityPart` corresponds to which semantic field.

Determine this from the actual response content.

Create a component mapping layer so that the parser does not depend on hard-coded response positions.

---

# 11. Generalization

The extractor must accept arbitrary LinkedIn profile URLs in the supported format.

Example:

```text
https://www.linkedin.com/in/alice/
https://www.linkedin.com/in/bob/
```

Extract the vanity name or other required profile identifier.

Do not use:

```text
if (vanityName === "vpnk2003") ...
```

The test profile is only for development.

The same extraction pipeline must operate against another profile using the same authenticated session, subject to LinkedIn access permissions.

---

# 12. Redis caching

Use Redis as the profile cache.

Suggested key:

```text
linkedin:profile:<normalized-profile-url>
```

or preferably a normalized identifier:

```text
linkedin:profile:<vanityName>
```

Cache the final normalized JSON response.

Initial TTL:

```text
1800 seconds
```

Flow:

```text
Request
   ↓
Rate limiter
   ↓
Redis GET
   ↓
 ┌─────────────┐
 │ cache exists│
 └──────┬──────┘
    yes │ no
        │
        ▼
   return JSON
        │
        └───────────────┐
                        ▼
               LinkedIn requests
                        ↓
                      parse
                        ↓
                    Redis SET
                        ↓
                    return JSON
```

A cache hit should not generate LinkedIn requests.

---

# 13. Redis rate limiting

Use Redis-backed rate limiting.

Initial policy:

```text
5 requests per IP per 60 seconds
```

The exact limit should be configurable through environment variables.

Rate-limit before expensive LinkedIn requests.

Return HTTP 429 when the limit is exceeded.

Example:

```json
{
  "error": "rate_limit_exceeded",
  "message": "Too many requests"
}
```

Do not rely on in-memory rate limiting because the application is publicly deployed and may eventually run multiple instances.

---

# 14. Request validation

Accept only LinkedIn profile URLs.

Reject:

```text
invalid URLs
non-LinkedIn domains
missing URL
malformed profile paths
```

Return HTTP 400.

Do not allow the caller to supply arbitrary LinkedIn API URLs.

The caller supplies:

```json
{
  "url": "https://www.linkedin.com/in/example/"
}
```

The server determines which internal requests are necessary.

---

# 15. Error handling

Handle separately:

```text
400 — invalid profile URL
401/403 — LinkedIn authentication/session failure
404 — profile unavailable
429 — API rate limit
502/503 — LinkedIn upstream failure
500 — unexpected parser/server failure
```

Do not leak:

* cookies
* authorization headers
* internal request headers
* raw authenticated LinkedIn responses
* internal stack traces

Log useful diagnostic information without logging credentials.

---

# 16. Development testing

Create tests for:

### URL parser

```text
valid LinkedIn profile URL
invalid URL
non-LinkedIn URL
URL with query parameters
URL with trailing slash
```

### Redis

```text
cache miss
cache hit
TTL
rate-limit counter
```

### Parser

Use saved HAR responses as fixtures.

Test:

```text
About extraction
Experience extraction
Education extraction
Skills extraction
Certification extraction
Language extraction
Image extraction
```

This allows parser development without repeatedly hitting LinkedIn.

---

# 17. Public API

Expose:

```http
POST /api/profile
```

Request:

```json
{
  "url": "https://www.linkedin.com/in/example/"
}
```

Response:

```json
{
  "profile": {},
  "experience": [],
  "education": [],
  "skills": [],
  "certifications": [],
  "languages": [],
  "featured": [],
  "services": []
}
```

Also provide:

```http
GET /health
```

Response:

```json
{
  "status": "ok"
}
```

---

# 18. Railway deployment

Deploy the Node.js API to Railway.

Configure:

```text
PORT
LINKEDIN_LI_AT
LINKEDIN_JSESSIONID
REDIS_URL
CACHE_TTL_SECONDS
RATE_LIMIT_WINDOW_SECONDS
RATE_LIMIT_MAX_REQUESTS
```

Do not commit credentials.

Use the Railway-provided public HTTPS domain.

Test:

```text
GET /health
POST /api/profile
```

from outside the development machine.

---

# 19. Docker

Provide a Dockerfile for the API.

For local development, provide Docker Compose containing:

```text
api
redis
```

The local environment should allow:

```bash
docker compose up
```

and produce a functioning local API.

---

# 20. Implementation order

Do NOT implement everything at once.

Follow this exact sequence:

```text
PHASE 1
HAR analysis
      ↓
identify exact Experience request
      ↓
reproduce request in Node
      ↓
SUCCESS
```

```text
PHASE 2
RSC parser
      ↓
parse Experience response
      ↓
produce normalized experience[]
      ↓
SUCCESS
```

```text
PHASE 3
identify remaining profile component requests
      ↓
implement extraction
      ↓
complete normalized profile
      ↓
SUCCESS
```

```text
PHASE 4
Express API
      ↓
POST /api/profile
      ↓
SUCCESS
```

```text
PHASE 5
Redis cache
      ↓
Redis rate limiter
      ↓
SUCCESS
```

```text
PHASE 6
Railway deployment
      ↓
public HTTPS endpoint
      ↓
SUCCESS
```

```text
PHASE 7
README
      ↓
API documentation
      ↓
example request/response
      ↓
final demo
```

---

# 21. Important engineering constraints

1. Do not use browser automation as the primary implementation.
2. Do not hard-code one LinkedIn profile.
3. Do not hard-code response positions where a semantic component identifier can be used.
4. Do not depend on CSS class names.
5. Do not expose LinkedIn session cookies.
6. Do not implement LinkedIn username/password login.
7. Do not log authentication cookies.
8. Do not hit LinkedIn repeatedly when the requested profile is cached.
9. Do not implement Redis before proving the LinkedIn HTTP request works.
10. Use the supplied HAR captures as the source of truth for request structure.
11. Preserve raw HAR responses as local fixtures for parser testing.
12. Keep LinkedIn-specific request logic isolated from the generic API layer.

---

# 22. Definition of done

The project is complete when:

* A public Railway URL exists.
* `POST /api/profile` accepts a LinkedIn profile URL.
* The server authenticates using the configured test session.
* The server fetches the required LinkedIn component responses without browser automation.
* At least the requested core profile fields are extracted.
* Experience, education, skills, certifications and languages are extracted when available.
* Profile images are extracted when available.
* Results are normalized into stable JSON.
* Redis caches profile results.
* Redis-backed rate limiting protects the API.
* Invalid requests return appropriate errors.
* Credentials never appear in source control, responses, or logs.
* The API works against more than the original test profile.
* README contains setup, environment variables, API usage, deployment instructions and limitations.
