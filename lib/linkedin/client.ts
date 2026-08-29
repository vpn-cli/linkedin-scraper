import {
  buildActivityRequest,
  buildProfileComponentRequest,
  COMPONENT_IDS,
  PROFILE_COMPONENTS,
  type ComponentId,
} from "./requests";

const LINKEDIN_ORIGIN = "https://www.linkedin.com";

export interface LinkedInResponses {
  activity: string;
  components: Record<ComponentId, string>;
}

export class LinkedInClient {
  private readonly liAt: string;
  private readonly jsessionId: string;

  constructor() {
    const liAt = process.env.LINKEDIN_LI_AT;
    const jsessionId =
      process.env.LINKEDIN_JSESSIONID;

    if (!liAt) {
      throw new Error(
        "LINKEDIN_LI_AT environment variable is missing"
      );
    }

    if (!jsessionId) {
      throw new Error(
        "LINKEDIN_JSESSIONID environment variable is missing"
      );
    }

    this.liAt = liAt;
    this.jsessionId =
      jsessionId.replace(/^"|"$/g, "");
  }

  private getHeaders(
    profileUrl: string
  ): Record<string, string> {
    return {
      Accept: "*/*",
      "Content-Type": "application/json",

      "x-li-rsc-stream": "true",

      /*
       * LinkedIn uses the JSESSIONID value as the CSRF
       * token in the captured requests.
       */
      "csrf-token": this.jsessionId,

      Origin: LINKEDIN_ORIGIN,

      Referer: profileUrl,

      "x-li-page-instance":
        "urn:li:page:d_flagship3_profile_view_base",

      "x-li-track": JSON.stringify({
        clientVersion: "0.2.6975",
        mpVersion: "0.2.6975",
        osName: "web",
        timezoneOffset: 5.5,
        timezone: "Asia/Kolkata",
        deviceFormFactor: "DESKTOP",
        mpName: "web",
        displayDensity: 1,
      }),

      Cookie: [
        `JSESSIONID="${this.jsessionId}"`,
        `li_at=${this.liAt}`,
      ].join("; "),
    };
  }

  private async post(
    url: string,
    body: Record<string, unknown>,
    profileUrl: string
  ): Promise<string> {
    const response = await fetch(url, {
      method: "POST",

      headers: this.getHeaders(profileUrl),

      body: JSON.stringify(body),

      cache: "no-store",
    });

    if (!response.ok) {
      const errorBody = await response
        .text()
        .catch(() => "");

      throw new Error(
        `LinkedIn request failed: ${response.status} ${response.statusText} — ${errorBody.slice(0, 200)}`
      );
    }

    return response.text();
  }

  async fetchActivity(
    vanityName: string,
    profileUrl: string
  ): Promise<string> {
    const request =
      buildActivityRequest(vanityName);

    return this.post(
      request.url,
      request.body,
      profileUrl
    );
  }

  async fetchComponent(
    componentId: ComponentId,
    vanityName: string,
    vieweeProfileId: string,
    profileUrl: string
  ): Promise<string> {
    const request =
      buildProfileComponentRequest(
        componentId,
        vanityName,
        vieweeProfileId
      );

    return this.post(
      request.url,
      request.body,
      profileUrl
    );
  }

  /**
   * Fetch all components needed by our ProfileResponse.
   *
   * Activity is fetched first because the returned RSC
   * payload contains the fsd_profile identifier required
   * by the subsequent profile-card requests.
   */
  async fetchProfile(
    vanityName: string,
    profileUrl: string
  ): Promise<LinkedInResponses> {
    const activity =
      await this.fetchActivity(
        vanityName,
        profileUrl
      );

    // DEBUG: Inspect raw activity response
    const vieweeProfileId =
      extractVieweeProfileId(activity);

    console.log('[DEBUG] Extracted vieweeProfileId:', vieweeProfileId);

    if (!vieweeProfileId) {
      throw new Error(
        "Could not extract vieweeProfileId from LinkedIn activity response"
      );
    }

    /*
     * These requests are independent once we have
     * vieweeProfileId, so fetch them concurrently.
     *
     * We use Promise.allSettled so that one failing
     * component does not discard the rest.
     */
    const settled = await Promise.allSettled(
      PROFILE_COMPONENTS.map(
        async (componentId) => {
          const response =
            await this.fetchComponent(
              componentId,
              vanityName,
              vieweeProfileId,
              profileUrl
            );

          return [
            componentId,
            response,
          ] as const;
        }
      )
    );

    const components: Partial<
      Record<ComponentId, string>
    > = {};

    for (const result of settled) {
      if (
        result.status === "fulfilled"
      ) {
        const [id, response] =
          result.value;

        components[id] = response;
      } else {
        console.warn(
          `[LinkedIn] Component request failed:`,
          result.reason
        );
      }
    }

    return {
      activity,
      components:
        components as Record<
          ComponentId,
          string
        >,
    };
  }
}

/**
 * LinkedIn's RSC response contains the target profile URN:
 *
 * urn:li:fsd_profile:ACo...
 *
 * We return only the identifier portion because that is
 * what the captured component payload expects.
 */
export function extractVieweeProfileId(
  response: string
): string | null {
  const patterns = [
    /activity_currentPill(ACo[A-Za-z0-9_-]+)/,
    /profileActivityContentCreation(ACo[A-Za-z0-9_-]+)/,
  ];

  for (const pattern of patterns) {
    const match = response.match(pattern);

    if (match?.[1]) {
      return match[1];
    }
  }

  return null;
}