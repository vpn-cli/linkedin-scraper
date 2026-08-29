LinkedIn Profile Scraper API (Voyager Reverse-Engineered)
An open-source, high-performance API built with Next.js App Router that accepts any LinkedIn profile URL and returns comprehensive, structured JSON profile data.  
PDF

Unlike traditional DOM scrapers that load headless browsers (e.g., Puppeteer/Playwright) to parse obfuscated HTML, this project reverse-engineers LinkedIn's internal Voyager REST API. This design yields response times under one second, avoids serverless function execution timeouts, and delivers consistent structured output.  
PDF
+ 1

Table of Contents
Project Overview

System Architecture

End-to-End Project Flow

Technical Approach & Reverse Engineering

Response Schema

Setup & Installation

API Documentation

Rate Limiting & Caching

Known Limitations

Project Overview
The objective of this service is to provide an on-demand programmatic endpoint for extracting detailed public profile information from LinkedIn.  
PDF

Key Features
URL Parsing: Accepts standard LinkedIn profile URLs and extracts the unique profile identifier (publicIdentifier).  
PDF

Direct Voyager Querying: Bypasses client rendering by querying internal identity endpoints with authenticated session headers.

Normalized Data Transformer: Traverses and deserializes LinkedIn's normalized included array into clean, strongly typed JSON objects.  
PDF

Abuse Protection & Caching: Uses Redis (Upstash) for sliding-window IP rate limiting and response caching to protect upstream session credentials.

System Architecture
[ Client Request: GET /api/profile?url=https://linkedin.com/in/{handle} ]
                               │
                               ▼
                ┌──────────────────────────────┐
                │     Next.js API Route        │
                │  (app/api/profile/route.ts)  │
                └──────────────┬───────────────┘
                               │
                ┌──────────────┴───────────────┐
                ▼                              ▼
      [ Rate Limiter (Redis) ]       [ Cache Check (Redis) ]
      (Sliding Window / IP)          (Hit: Return Cached JSON)
                │                              │
                └──────────────┬───────────────┘
                               │ (Cache Miss)
                               ▼
                ┌──────────────────────────────┐
                │   Identifier Extractor       │
                │   (Parses URL & Pathname)    │
                └──────────────┬───────────────┘
                               │
                               ▼
                ┌──────────────────────────────┐
                │   LinkedIn Voyager Client    │
                │  Injects: li_at + JSESSIONID │
                │  Header: csrf-token          │
                └──────────────┬───────────────┘
                               │
                               ▼
                ┌──────────────────────────────┐
                │ LinkedIn Voyager Endpoint    │
                │ (/voyager/api/identity/...)  │
                └──────────────┬───────────────┘
                               │
                               ▼
                ┌──────────────────────────────┐
                │ Normalized Data Transformer  │
                │ (Filters `$type` entities)   │
                └──────────────┬───────────────┘
                               │
                               ▼
                ┌──────────────────────────────┐
                │  200 OK: Structured JSON     │
                └──────────────────────────────┘
End-to-End Project Flow
Request Ingestion: The client sends an HTTPS GET request containing the target LinkedIn profile URL as a query parameter.  
PDF

Rate Limit Verification: The route handler checks the client IP against Upstash Redis. If the request threshold is exceeded, it returns 429 Too Many Requests.

Cache Lookup: The system checks Redis for a cached response for the target handle. If present, it returns cached JSON immediately.

URL Normalization: The identifier extractor isolates the slug (e.g., [https://www.linkedin.com/in/john-doe/?isSelfProfile=false](https://www.linkedin.com/in/john-doe/?isSelfProfile=false) → john-doe).

Upstream Request Execution: The server dispatches an authenticated GET request to:
[https://www.linkedin.com/voyager/api/identity/profiles/](https://www.linkedin.com/voyager/api/identity/profiles/){publicIdentifier}/profileView
along with the cookie string (li_at, JSESSIONID) and the csrf-token header.

Payload Parsing & Mapping: The raw response's included array is parsed by entity $type (e.g., Profile, Position, Education, Skill) and mapped to the output schema.  
PDF

Cache Population & Response: The formatted JSON is stored in Redis with a 24-hour TTL and returned to the client with 200 OK.  
PDF

Technical Approach & Reverse Engineering
Authentication Mechanics
LinkedIn internal endpoints require stateful session credentials rather than standard OAuth tokens:

li_at: The primary session authentication cookie representing the backend mock account.

JSESSIONID: The session identifier used for Cross-Site Request Forgery (CSRF) protection.

csrf-token: A required request header that must match the unquoted value of JSESSIONID.

Deserializing Normalized Responses
Voyager endpoints return normalized graph structures where all profile-related entities are flattened into a single top-level included array. The parser filters elements using the $type property:

Entity Type	Target $type String
Profile Metadata	
com.linkedin.voyager.dash.identity.profile.Profile

  
PDF

Experience	
com.linkedin.voyager.dash.identity.profile.Position

  
PDF

Education	
com.linkedin.voyager.dash.identity.profile.Education

  
PDF

Skills	
com.linkedin.voyager.dash.identity.profile.Skill

  
PDF

Certifications	
com.linkedin.voyager.dash.identity.profile.Certification

  
PDF

Response Schema
The endpoint returns structured JSON formatted as follows:  
PDF

JSON
{
  "publicIdentifier": "john-doe",
  "name": {
    "firstName": "John",
    "lastName": "Doe",
    "fullName": "John Doe"
  },
  "headline": "Senior Software Engineer at TechCorp",
  "location": "San Francisco Bay Area",
  "about": "Experienced full-stack engineer passionate about distributed systems.",
  "profilePicture": "https://media.licdn.com/dms/image/...",
  "experience": [
    {
      "title": "Senior Software Engineer",
      "companyName": "TechCorp",
      "location": "San Francisco, CA",
      "timePeriod": {
        "startDate": "2021-01",
        "endDate": "Present"
      },
      "description": "Leading backend infrastructure initiatives."
    }
  ],
  "education": [
    {
      "schoolName": "University of California, Berkeley",
      "degreeName": "Bachelor of Science",
      "fieldOfStudy": "Computer Science",
      "timePeriod": {
        "startDate": "2016",
        "endDate": "2020"
      }
    }
  ],
  "skills": [
    "TypeScript",
    "Next.js",
    "Distributed Systems",
    "Redis"
  ],
  "certifications": [],
  "languages": ["English", "Spanish"]
}
Setup & Installation
1. Prerequisites
Node.js 18.x or later

An active Upstash Redis instance (for rate limiting and caching)

A dedicated secondary/mock LinkedIn account

2. Clone and Install
Bash
git clone https://github.com/your-username/linkedin-profile-scraper.git
cd linkedin-profile-scraper
npm install
3. Configure Environment Variables
Create a .env.local file in the root directory and ensure it is listed in .gitignore to keep credentials secure:  
PDF

Code snippet
# LinkedIn Mock Account Session Cookies
LINKEDIN_LI_AT="your_li_at_cookie_value"
LINKEDIN_JSESSIONID="ajax:1234567890123456789"

# Upstash Redis Configuration
UPSTASH_REDIS_REST_URL="https://your-upstash-instance.upstash.io"
UPSTASH_REDIS_REST_TOKEN="your_upstash_rest_token"
4. Run Development Server
Bash
npm run dev
The API route will be available at http://localhost:3000/api/profile.

API Documentation
GET /api/profile
Fetches and returns structured profile information for a target LinkedIn user.  
PDF

Query Parameters
url (string, required): The full public URL of the LinkedIn profile (e.g., [https://www.linkedin.com/in/target-user/](https://www.linkedin.com/in/target-user/)).  
PDF

Example Request
Bash
curl -X GET "https://your-deployment-domain.com/api/profile?url=https://www.linkedin.com/in/john-doe/"
Status Codes
200 OK: Profile data successfully parsed and returned.  
PDF

400 Bad Request: Missing or malformed LinkedIn URL.

401 Unauthorized: Backend LinkedIn session cookies expired or invalidated.

404 Not Found: Target profile could not be found or is private.

429 Too Many Requests: Rate limit exceeded.

500 Internal Server Error: Parsing error or upstream communication failure.

Rate Limiting & Caching
To ensure stability when deployed publicly over HTTPS, the API incorporates two defensive mechanisms:  
PDF

Rate Limiting: Implemented via @upstash/ratelimit using a sliding window algorithm (default: 10 requests per minute per IP address).

Response Caching: Successful profile payloads are cached in Redis with a 24-hour TTL (EX 86400). Repeat requests for the same profile handle resolve from cache in sub-50ms without initiating outbound calls to LinkedIn.

Known Limitations
As required by the challenge specification, below are the known technical limitations of this reverse-engineered approach:  
PDF

Session Expiry & Rotation: LinkedIn's session cookies (li_at) are subject to periodic expiration or invalidation when security challenges are triggered. Stored cookies must be manually renewed in environment settings if the account session ends.  
PDF
+ 1

Account Security Challenges: High-volume traffic or anomalous geographic IP shifts can trigger LinkedIn CAPTCHA or checkpoint challenges, temporarily blocking profile requests until verified via a browser session.

Private Profiles & Connection Visibility: Profiles configured with restricted visibility settings or members outside network search parameters may return partial data compared to full 1st/2nd-degree connections.

Internal Schema Volatility: Because the Voyager API is internal and undocumented, LinkedIn may update its $type definitions or query parameters without prior notice, necessitating occasional parser updates.