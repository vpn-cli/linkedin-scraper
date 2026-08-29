# Project Overview

## About the Project
The LinkedIn Profile Scraper API is an open-source, high-performance API built with Next.js App Router. It accepts any LinkedIn profile URL and returns comprehensive, structured JSON profile data. Unlike traditional DOM scrapers that load headless browsers (e.g., Puppeteer) to parse obfuscated HTML, this project reverse-engineers LinkedIn's internal Voyager REST API.

## The Problem It Solves
Traditional scrapers are slow, flaky, and resource-intensive because they rely on headless browsers and complex DOM parsing subject to breaking changes. This project directly queries the internal Voyager endpoints, avoiding DOM parsing, reducing response times to under one second, eliminating serverless function timeouts, and delivering clean, normalized JSON.

## Key Features
- **URL Parsing**: Accepts standard LinkedIn profile URLs and extracts the unique public profile identifier.
- **Direct Voyager Querying**: Bypasses client rendering by querying internal identity endpoints with authenticated session headers.
- **Normalized Data Transformer**: Traverses and deserializes LinkedIn's normalized included array into clean, strongly typed JSON objects filtering by `$type`.
- **Abuse Protection & Caching**: Uses Upstash Redis for sliding-window IP rate limiting (10 req/min) and response caching (24h TTL) to protect upstream session credentials.

## End-to-End Flow
1. **Client Request**: GET `/api/profile?url=https://linkedin.com/in/{handle}`
2. **Rate Limiting**: Check IP against Redis (429 if exceeded).
3. **Cache Lookup**: Check Redis for existing handle data (return cache if hit).
4. **URL Normalization**: Extract the slug string identifying the user.
5. **Upstream Request**: Dispatch authenticated request to Voyager `profileView` with `li_at`, `JSESSIONID`, and `csrf-token`.
6. **Payload Parsing**: Parse the raw included array by mapping entity types like `Profile`, `Position`, `Education`, and `Skill`.
7. **Cache Population**: Store the JSON payload in Redis with a 24-hour TTL and return 200 OK.

## Target Audience
Developers, data engineers, or recruiters who need reliable, fast, and structured on-demand LinkedIn profile data without the overhead of maintaining headless browsers.

## Known Limitations
- Session cookies (`li_at`) occasionally expire and must be manually renewed. 
- High traffic may trigger LinkedIn CAPTCHAs or checkpoint challenges.
- Private profiles or out-of-network connections may return partial dataset compared to 1st-degree connections.
- Undocumented internal schema volatility means parser logic might need updates occasionally.