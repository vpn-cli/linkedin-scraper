GET /api/profile?url=<linkedin-url>
              │
              ▼
        Validate URL exists
              │
              ▼
        Redis rate limit
              │
              ▼
     Extract LinkedIn identifier
              │
              ▼
        Redis cache lookup
              │
          ┌───┴────┐
        HIT        MISS
         │           │
         ▼           ▼
      Return     API client
                    │
                    ▼
                 Parser
                    │
                    ▼
              Cache 24h
                    │
                    ▼
                 Return