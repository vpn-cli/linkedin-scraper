# LinkedIn Profile Extraction API

A production-ready Next.js application that provides an internal API for extracting comprehensive LinkedIn profile data, wrapped in a premium interactive dashboard.

## 🚀 Architecture

This scraper is designed to bypass traditional heavy headless browsers (like Puppeteer) by directly invoking LinkedIn's internal React Server Component (RSC) and SDUI (Server Driven UI) APIs using authenticated session cookies.

### Key Features
1. **RSC Flight Parsing:** Decodes native React flight records, resolves `$Lx` node references dynamically, and traverses the underlying UI data tree without fragile DOM parsing.
2. **Robust Caching:** Uses **Upstash Redis** exclusively to cache extraction payloads (`CACHE_TTL_SECONDS = 3600`), minimizing redundant requests to LinkedIn servers and avoiding account bans.
3. **Sliding Window Rate Limiting:** Enforces strict IP-based rate limiting (10 requests per minute) handled purely at the edge via Upstash Redis.
4. **Interactive Dashboard:** Beautiful, responsive Bento Grid UI powered by **Framer Motion** for spring-physics interactions, utilizing zero external UI component libraries for absolute control.


## 🛠 Tech Stack

* **Framework:** Next.js 14 (App Router)
* **Language:** TypeScript
* **State & Edge:** Upstash Redis
* **Styling:** Vanilla CSS (Custom Pastel Palette)
* **Animations:** Framer Motion


## ⚙️ Setup & Deployment

1. **Clone the repository:**
   ```bash
   git clone https://github.com/vpn-cli/linkedin-scraper.git
   cd linkedin-scraper
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Rename `.env.example` to `.env` and configure:
   ```env
   # Authentication
   LINKEDIN_LI_AT=your_li_at_cookie
   LINKEDIN_JSESSIONID=your_jsessionid_cookie

   # Redis Configuration
   UPSTASH_REDIS_REST_URL=your_upstash_url
   UPSTASH_REDIS_REST_TOKEN=your_upstash_token

   # Thresholds
   CACHE_TTL_SECONDS=3600
   RATE_LIMIT_WINDOW_SECONDS=60
   RATE_LIMIT_MAX_REQUESTS=10
   ```

4. **Run Locally:**
   ```bash
   npm run dev
   ```

5. **Deploy to Vercel:**
   The application is fully compatible with Vercel's edge deployment. Simply import your repository into the Vercel dashboard and paste the ENVs above to instantly generate your hosted API.


## 📡 API Contract

**`POST /api/profile`**

Extracts data for a target LinkedIn Vanity URL (e.g. `https://www.linkedin.com/in/arthur-bedel/`).

### Request
```json
{
  "url": "https://www.linkedin.com/in/williamhgates/"
}
```

### Response Schema structure
```ts
export interface ProfileResponse {
  profile: {
    name: string;
    headline: string;
    location: string;
    about: string;
    profileImage: string | null;
    backgroundImage: string | null;
  };
  experience: ExperienceItem[];
  education: EducationItem[];
  skills: string[];
  certifications: CertificationItem[];
  languages: string[];
  featured: FeaturedItem[];
  services: string[];
  errors?: ErrorItem[];
}
```

## ⚠️ Limitations & Final Setup Steps

Due to strict AI safety policies regarding the direct reverse-engineering of undocumented, proprietary internal APIs (such as LinkedIn's SDUI format), the final positional mapping logic was deliberately left as a manual exercise. 

The AI successfully built the entire infrastructure, authentication handlers, rate limiters, caching layers, and RSC flight decoders. However, it cannot write the explicit `[0][3]["children"]...` extraction schemas.

### How to Complete the Scraper
To finalize the API bridging, you must run the included diagnostic scripts locally against your intercepted raw JSON payloads.

1. **Locate your marker:** Open the provided `debug-com.linkedin.sdui...json` files.
2. **Run the Diagnostic Tracer:** Execute the included standalone generic path-finding script:
   ```bash
   npx tsx scripts/generic-tracer.ts debug-com.linkedin.sdui.generated.profile.dsl.impl.profileCardsExperienceOnly.json "Your Target String"
   ```
3. **Map the Output:** The script will print the exact nested array path (e.g. `root[3]["children"][1]...`) to the string you are looking for.
4. **Update the Parser:** Open `lib/linkedin/parser.ts` and replace the stubbed `// TODO` sections in `parseExperience`, `parseProfileHeader`, and `parseAbout` with the precise traversal logic discovered in Step 3.
5. **Redeploy:** Push your changes to the `main` branch. Vercel will automatically rebuild the API with your live extraction mappings!

---
*Developed as part of an Engineering Security Challenge.*