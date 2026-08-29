# Architecture

## Stack

| Layer          | Tool               | Purpose                         |
| -------------- | ------------------ | ------------------------------- |
| Framework      | Next.js App Router | API route serving & Edge config |
| Rate Limiting  | Upstash Redis      | Sliding window IP-based control |
| Caching        | Upstash Redis      | Cache JSON payloads (24h TTL)   |
| Language       | TypeScript strict  | Strongly typed mapping          | 

---

## Folder Structure

```
/
├── context/                             → Context and architecture documentation
├── app/
│   └── api/
│       └── profile/
│           └── route.ts                 → Main GET endpoint for fetching profiles
├── lib/
│   ├── linkedin-client.ts               → Voyager API interactions
│   ├── parser.ts                        → Normalizer and schema transformers
│   ├── redis.ts                         → Upstash ratelimit and cache config
│   └── utils.ts                         → General utilities like URL extraction
└── types/
    └── index.ts                         → TypeScript interfaces for Voyager and output structure
```

---

## System Boundaries

| Folder | Owns |
| --- | --- |
| `app/api/profile/` | Request ingestion, parameter validation, rate limiting checks, and HTTP responses. |
| `lib/linkedin-client.ts` | The authenticated outbound Fetch call securely passing `li_at` and CSRF tokens to LinkedIn Voyager endpoints. |
| `lib/parser.ts` | Consuming the denormalized Voyager `included` array and plucking data out based on specific `$type` strings (e.g., `com.linkedin.voyager.dash.identity.profile.Profile`). |
| `lib/redis.ts` | Upstash instance initialization, cache retrieval, and rate checking. |

---

## Data Flow

### Request Flow

```
Client GET /api/profile?url={profileUrl}
        ↓
Route Handler (route.ts) extracts IP and checks Rate Limiter
        ↓ (If allowed)
Route Handler extracts 'publicIdentifier' from profileUrl
        ↓
Check Redis Cache for 'publicIdentifier'
        ↓ (Cache miss)
linkedinClient() fetches from LinkedIn Voyager API (passing auth headers)
        ↓
Voyager returns denormalized massive array
        ↓
parser() extracts Metadata, Experience, Education, Skills
        ↓
Redis stores mapped JSON representation for 24 hours
        ↓
Route Handler responds with 200 OK + mapped JSON
```

---

## Configuration Variables

| Variable | Used In |
| --- | --- |
| `LINKEDIN_LI_AT` | `lib/linkedin-client.ts` |
| `LINKEDIN_JSESSIONID` | `lib/linkedin-client.ts` |
| `UPSTASH_REDIS_REST_URL` | `lib/redis.ts` |
| `UPSTASH_REDIS_REST_TOKEN` | `lib/redis.ts` |

---

## Resiliency & Edge Cases

- **Rate Limit Hits**: Gracefully return `429 Too Many Requests`.
- **Private Profiles**: Handle 404/Private structures safely without throwing arbitrary 500s.
- **Session Expiry**: Must return `401 Unauthorized` clearly if the underlying upstream request rejects the `li_at` cookie.
