import type {
  ProfileResponse,
  ExperienceItem,
  EducationItem,
  CertificationItem,
  FeaturedItem,
} from "../../types";

import {
  COMPONENT_IDS,
  type ComponentId,
} from "./requests";

type RscRecordMap = Record<
  string,
  unknown
>;

type RawResponses = {
  activity: string;
  components: Partial<
    Record<ComponentId, string>
  >;
};

/* -------------------------------------------------------------------------- */
/* Public API                                                                 */
/* -------------------------------------------------------------------------- */

export function parseProfileResponse(
  responses: RawResponses
): ProfileResponse {
  const activity =
    parseRscResponse(
      responses.activity
    );

  const above =
    parseComponent(
      responses.components[
        COMPONENT_IDS.aboveActivity
      ]
    );

  const experience =
    parseComponent(
      responses.components[
        COMPONENT_IDS.experience
      ]
    );

  const educationAndCertifications =
    parseComponent(
      responses.components[
        COMPONENT_IDS.belowActivityPart1
      ]
    );

  const languages =
    parseComponent(
      responses.components[
        COMPONENT_IDS.belowActivityPart4
      ]
    );

  const skills =
    parseComponent(
      responses.components[
        COMPONENT_IDS.belowActivityPart7
      ]
    );

  const errors: ProfileResponse["errors"] =
    [];

  const profile =
    parseProfileHeader(activity);

  /*
   * The supplied HARs expose About, but do not expose
   * target-profile headline/location/profile-image/
   * background-image fields in these RSC components.
   *
   * Therefore we deliberately do not guess them.
   */
  if (!profile.headline) {
    errors.push({
      field: "profile.headline",
      reason:
        "Headline was not present in the captured profile RSC components",
    });
  }

  if (!profile.location) {
    errors.push({
      field: "profile.location",
      reason:
        "Location was not present in the captured profile RSC components",
    });
  }

  if (!profile.profileImage) {
    errors.push({
      field: "profile.profileImage",
      reason:
        "Target profile image was not present in the captured profile RSC components",
    });
  }

  if (!profile.backgroundImage) {
    errors.push({
      field: "profile.backgroundImage",
      reason:
        "Target background image was not present in the captured profile RSC components",
    });
  }

  const about =
    parseAbout(above);

  profile.about = about;

  const result: ProfileResponse = {
    profile,

    experience:
      parseExperience(experience),

    education:
      parseEducation(
        educationAndCertifications
      ),

    skills:
      parseSkills(skills),

    certifications:
      parseCertifications(
        educationAndCertifications
      ),

    languages:
      parseLanguages(languages),

    featured:
      parseFeatured(above),

    services:
      parseServices(above),
  };

  if (errors.length > 0) {
    result.errors = errors;
  }

  return result;
}

/* -------------------------------------------------------------------------- */
/* RSC decoding                                                               */
/* -------------------------------------------------------------------------- */

function parseComponent(
  response?: string
): unknown {
  if (!response) {
    return null;
  }

  return parseRscResponse(response);
}

function parseRscResponse(
  response: string
): unknown {
  const records: RscRecordMap = {};

  /*
   * RSC flight responses are newline-delimited records:
   *
   * 0:[...]
   * 1:I[...]
   * 2:null
   * 6:[...]
   */
  for (const line of response.split(/\r?\n/)) {
    const separator =
      line.indexOf(":");

    if (separator === -1) {
      continue;
    }

    const id =
      line.slice(0, separator);

    const payload =
      line.slice(separator + 1);

    try {
      records[id] =
        JSON.parse(payload);
    } catch {
      /*
       * Not every RSC line is guaranteed to be a
       * standalone JSON value. Ignore malformed records.
       */
    }
  }

  return resolveRscReferences(
    records["0"],
    records
  );
}

function resolveRscReferences(
  value: unknown,
  records: RscRecordMap,
  resolving = new Set<string>()
): unknown {
  if (
    typeof value === "string"
  ) {
    /*
     * RSC references look like "$L6".
     */
    if (
      value.startsWith("$L") &&
      records[value.slice(2)] !==
        undefined
    ) {
      const id =
        value.slice(2);

      if (resolving.has(id)) {
        return value;
      }

      const next =
        new Set(resolving);

      next.add(id);

      return resolveRscReferences(
        records[id],
        records,
        next
      );
    }

    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) =>
      resolveRscReferences(
        item,
        records,
        resolving
      )
    );
  }

  if (
    value !== null &&
    typeof value === "object"
  ) {
    const result: Record<
      string,
      unknown
    > = {};

    for (const [
      key,
      child,
    ] of Object.entries(
      value as Record<
        string,
        unknown
      >
    )) {
      result[key] =
        resolveRscReferences(
          child,
          records,
          resolving
        );
    }

    return result;
  }

  return value;
}

/* -------------------------------------------------------------------------- */
/* Generic traversal                                                          */
/* -------------------------------------------------------------------------- */

function findByObservabilityIdentifier(
  root: unknown,
  identifier: string
): unknown | null {
  if (
    root === null ||
    root === undefined
  ) {
    return null;
  }

  if (Array.isArray(root)) {
    for (const child of root) {
      const found =
        findByObservabilityIdentifier(
          child,
          identifier
        );

      if (found) {
        return found;
      }
    }

    return null;
  }

  if (
    typeof root !== "object"
  ) {
    return null;
  }

  const object =
    root as Record<
      string,
      unknown
    >;

  const observability =
    object[
      "observabilityIdentifier"
    ];

  if (
    typeof observability ===
      "string" &&
    observability === identifier
  ) {
    return root;
  }

  for (const child of Object.values(
    object
  )) {
    const found =
      findByObservabilityIdentifier(
        child,
        identifier
      );

    if (found) {
      return found;
    }
  }

  return null;
}

function collectStrings(
  root: unknown
): string[] {
  const result: string[] = [];

  function visit(value: unknown) {
    if (
      typeof value === "string"
    ) {
      const cleaned =
        cleanText(value);

      if (
        cleaned &&
        !cleaned.startsWith("$")
      ) {
        result.push(cleaned);
      }

      return;
    }

    if (Array.isArray(value)) {
      for (const child of value) {
        visit(child);
      }

      return;
    }

    if (
      value !== null &&
      typeof value === "object"
    ) {
      for (const child of Object.values(
        value as Record<
          string,
          unknown
        >
      )) {
        visit(child);
      }
    }
  }

  visit(root);

  return result;
}

function cleanText(
  value: string
): string {
  return value
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function uniqueStrings(
  values: string[]
): string[] {
  return [
    ...new Set(
      values.map(cleanText)
    ),
  ];
}

function uniqueObjects<T>(
  values: T[]
): T[] {
  return [
    ...new Map(
      values.map((value) => [
        JSON.stringify(value),
        value,
      ])
    ).values(),
  ];
}

/* -------------------------------------------------------------------------- */
/* Profile                                                                    */
/* -------------------------------------------------------------------------- */

function parseProfileHeader(
  activity: unknown
): ProfileResponse["profile"] {
  const strings =
    collectStrings(activity);

  let name = "";

  /*
   * The activity RSC exposes the target name in
   * aria-labels such as:
   *
   * "Follow Bill Gates"
   */
  for (const value of strings) {
    const match =
      value.match(
        /^Follow\s+(.+)$/i
      );

    if (match?.[1]) {
      name =
        cleanText(match[1]);

      break;
    }
  }

  return {
    name,

    /*
     * These remain empty unless the actual target-profile
     * header fields are present in a future response.
     */
    headline: "",
    location: "",
    about: "",
    profileImage: null,
    backgroundImage: null,
  };
}

/* -------------------------------------------------------------------------- */
/* About                                                                      */
/* -------------------------------------------------------------------------- */

function parseAbout(
  aboveActivity: unknown
): string {
  const about =
    findByObservabilityIdentifier(
      aboveActivity,
      "com.linkedin.sdui.impl.profile.components.aboutSection"
    );

  if (!about) {
    return "";
  }

  const strings =
    collectStrings(about);

  /*
   * In the captured response the useful About text is
   * the long text following the "About" heading.
   */
  const candidates =
    strings.filter(
      (value) =>
        value.length > 30 &&
        !isUiText(value)
    );

  return candidates[0] ?? "";
}

/* -------------------------------------------------------------------------- */
/* Experience                                                                 */
/* -------------------------------------------------------------------------- */

function parseExperience(
  component: unknown
): ExperienceItem[] {
  const section =
    findByObservabilityIdentifier(
      component,
      "com.linkedin.sdui.impl.profile.components.experienceTopLevelSection"
    );

  if (!section) {
    return [];
  }

  const strings =
    filterUsefulStrings(
      collectStrings(section)
    );

  /*
   * The captured Experience component has this
   * repeated structure:
   *
   * title
   * company
   * date range
   *
   * For entries where LinkedIn exposes location or
   * description, we preserve them when they occur
   * between the company and date.
   */
  const result: ExperienceItem[] =
    [];

  for (
    let i = 0;
    i < strings.length;
    i++
  ) {
    const date =
      parseDateRange(strings[i]);

    if (!date) {
      continue;
    }

    const preceding =
      strings.slice(
        Math.max(0, i - 5),
        i
      );

    if (
      preceding.length < 2
    ) {
      continue;
    }

    /*
     * Walk backwards to find the company and title.
     * We ignore obvious UI labels.
     */
    const meaningful =
      preceding.filter(
        (value) =>
          !isUiText(value) &&
          !isImageAltText(value)
      );

    if (
      meaningful.length < 2
    ) {
      continue;
    }

    const companyName =
      meaningful[
        meaningful.length - 1
      ];

    const title =
      meaningful[
        meaningful.length - 2
      ];

    const remaining =
      meaningful.slice(
        0,
        -2
      );

    const location =
      remaining.find(
        (value) =>
          looksLikeLocation(value)
      ) ?? "";

    const description =
      remaining
        .filter(
          (value) =>
            value !== location
        )
        .join(" ");

    result.push({
      title,
      companyName,
      location,
      description,
      timePeriod: date,
    });
  }

  return uniqueObjects(result);
}

/* -------------------------------------------------------------------------- */
/* Education                                                                  */
/* -------------------------------------------------------------------------- */

function parseEducation(
  component: unknown
): EducationItem[] {
  const section =
    findByObservabilityIdentifier(
      component,
      "com.linkedin.sdui.impl.profile.components.educationTopLevelSection"
    );

  if (!section) {
    return [];
  }

  const strings =
    filterUsefulStrings(
      collectStrings(section)
    );

  const result: EducationItem[] =
    [];

  for (
    let i = 0;
    i < strings.length;
    i++
  ) {
    const date =
      parseDateRange(strings[i]);

    if (!date) {
      continue;
    }

    const preceding =
      strings.slice(
        Math.max(0, i - 5),
        i
      ).filter(
        (value) =>
          !isUiText(value) &&
          !isImageAltText(value)
      );

    if (
      preceding.length === 0
    ) {
      continue;
    }

    /*
     * Current captured profile:
     *
     * Harvard University
     * 1973 – 1975
     *
     * If degree/field are present, they are kept as
     * the additional preceding values.
     */
    const schoolName =
      preceding[
        preceding.length - 1
      ];

    const degreeName =
      preceding.length >= 2
        ? preceding[
            preceding.length - 2
          ]
        : "";

    const fieldOfStudy =
      preceding.length >= 3
        ? preceding[
            preceding.length - 3
          ]
        : "";

    result.push({
      schoolName,
      degreeName:
        degreeName === schoolName
          ? ""
          : degreeName,
      fieldOfStudy:
        fieldOfStudy === schoolName ||
        fieldOfStudy === degreeName
          ? ""
          : fieldOfStudy,
      timePeriod: date,
    });
  }

  return uniqueObjects(result);
}

/* -------------------------------------------------------------------------- */
/* Certifications                                                             */
/* -------------------------------------------------------------------------- */

function parseCertifications(
  component: unknown
): CertificationItem[] {
  const section =
    findByObservabilityIdentifier(
      component,
      "com.linkedin.sdui.impl.profile.components.certificationTopLevelSection"
    );

  /*
   * In the supplied HAR this section exists but
   * initialContent is undefined, so there is no actual
   * certification data to parse.
   */
  if (!section) {
    return [];
  }

  const strings =
    filterUsefulStrings(
      collectStrings(section)
    );

  if (
    strings.length === 0
  ) {
    return [];
  }

  const result: CertificationItem[] =
    [];

  for (
    let i = 0;
    i < strings.length;
    i++
  ) {
    const name =
      strings[i];

    if (
      isUiText(name) ||
      isImageAltText(name)
    ) {
      continue;
    }

    const authority =
      strings[i + 1] ?? "";

    const date =
      parseDateRange(
        strings[i + 2] ?? ""
      );

    result.push({
      name,
      authority:
        isUiText(authority)
          ? ""
          : authority,
      timePeriod: date,
    });

    if (date) {
      i += 2;
    } else {
      i++;
    }
  }

  return uniqueObjects(result);
}

/* -------------------------------------------------------------------------- */
/* Skills                                                                     */
/* -------------------------------------------------------------------------- */

function parseSkills(
  component: unknown
): string[] {
  const section =
    findByObservabilityIdentifier(
      component,
      "com.linkedin.sdui.impl.profile.components.skillsSection"
    );

  /*
   * The supplied HAR shows the Skills component shell,
   * but its initialContent is undefined. Therefore the
   * scroll request alone does not contain actual skills.
   */
  if (!section) {
    return [];
  }

  return filterUsefulStrings(
    collectStrings(section)
  ).filter(
    (value) =>
      value.length <= 100
  );
}

/* -------------------------------------------------------------------------- */
/* Languages                                                                  */
/* -------------------------------------------------------------------------- */

function parseLanguages(
  component: unknown
): string[] {
  const section =
    findByObservabilityIdentifier(
      component,
      "com.linkedin.sdui.impl.profile.components.languageTopLevelSection"
    );

  /*
   * Same situation as Skills: the captured component
   * contains the shell but no initialContent.
   */
  if (!section) {
    return [];
  }

  return filterUsefulStrings(
    collectStrings(section)
  );
}

/* -------------------------------------------------------------------------- */
/* Featured                                                                   */
/* -------------------------------------------------------------------------- */

function parseFeatured(
  aboveActivity: unknown
): FeaturedItem[] {
  const section =
    findByObservabilityIdentifier(
      aboveActivity,
      "com.linkedin.sdui.impl.profile.components.featuredSection"
    );

  if (!section) {
    return [];
  }

  const strings =
    filterUsefulStrings(
      collectStrings(section)
    );

  return strings.map(
    (title): FeaturedItem => ({
      title,
      url: null,
      description: "",
    })
  );
}

/* -------------------------------------------------------------------------- */
/* Services                                                                   */
/* -------------------------------------------------------------------------- */

function parseServices(
  aboveActivity: unknown
): string[] {
  const section =
    findByObservabilityIdentifier(
      aboveActivity,
      "com.linkedin.sdui.impl.profile.components.profileServicesSection"
    );

  if (!section) {
    return [];
  }

  return filterUsefulStrings(
    collectStrings(section)
  );
}

/* -------------------------------------------------------------------------- */
/* Date helpers                                                               */
/* -------------------------------------------------------------------------- */

interface ParsedDateRange {
  startDate: string;
  endDate: string;
}

function parseDateRange(
  value: string
): ParsedDateRange | null {
  const cleaned =
    cleanText(value);

  /*
   * LinkedIn uses an en dash in the captured
   * responses:
   *
   * 2000 – Present
   * Jan 2020 – Present
   * 1973 – 1975
   *
   * We require at least one side to contain
   * a year (4-digit number) to avoid matching
   * strings like "Full-time" or "Part-time".
   */
  const match =
    cleaned.match(
      /^(.+?)\s*[–—]\s*(Present|Current|.+)$/i
    );

  if (!match) {
    return null;
  }

  const left =
    cleanText(match[1]);
  const right =
    cleanText(match[2]);

  const hasYear =
    /\d{4}/.test(left) ||
    /\d{4}/.test(right) ||
    /^(Present|Current)$/i.test(
      right
    );

  if (!hasYear) {
    return null;
  }

  return {
    startDate: left,
    endDate: right,
  };
}

/* -------------------------------------------------------------------------- */
/* Filtering                                                                  */
/* -------------------------------------------------------------------------- */

function filterUsefulStrings(
  strings: string[]
): string[] {
  return uniqueStrings(
    strings.filter(
      (value) =>
        !isUiText(value) &&
        !isImageAltText(value) &&
        !looksLikeTechnicalIdentifier(
          value
        )
    )
  );
}

function isUiText(
  value: string
): boolean {
  return /^(About|Experience|Education|Skills|Languages|Featured|Services|Show all|See all|Follow|Following|Connect|Message|More|Activity|Posts|Post|Present|Current|open|small|large|horizontal|vertical|div|section|li|listitem|h2|h1|h3|id|contents|0|1|default|profile-card-featured|ProfileCardsServedEvent|1x|1\.5x|2x|3x)$/i.test(
    value
  ) ||
  value.includes('currentPage') ||
  value.includes('isEnd') ||
  value.includes('isBeginning');
}

function isImageAltText(
  value: string
): boolean {
  return /(?:logo|image|photo|avatar)$/i.test(
    value
  );
}

function looksLikeTechnicalIdentifier(
  value: string
): boolean {
  return (
    value.startsWith("com.linkedin.") ||
    value.startsWith("proto.") ||
    value.startsWith("urn:") ||
    value.startsWith("Profile_") ||
    value.startsWith("profile_") ||
    value.includes("componentKey") ||
    value.startsWith("carousel-") ||
    value.includes("100_100/B5") ||
    value.includes("200_200/B5") ||
    value.includes("400_400/B5") ||
    value.includes("profile-displayphoto-shrink_") ||
    value.includes("company-logo_") ||
    value.includes("?e=") ||
    value.includes("var(--") ||
    value.includes("https://www.linkedin.com/") ||
    value.includes("experience-divider") ||
    /^\s*(_?[0-9a-f]{8}\s*)+$/.test(value) ||
    /^[A-Za-z0-9+/=]{15,}$/.test(value) ||
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/.test(value) ||
    value.length > 300
  );
}

function looksLikeLocation(
  value: string
): boolean {
  /*
   * This is deliberately conservative.
   * We do not want arbitrary strings becoming
   * locations.
   *
   * Require a comma, short length, no years,
   * no lowercase-starting words (which suggest
   * sentences rather than place names), and at
   * most 3 comma-separated segments.
   */
  if (
    !value.includes(",") ||
    value.length >= 80 ||
    /\d{4}/.test(value)
  ) {
    return false;
  }

  const segments =
    value.split(",");

  if (segments.length > 3) {
    return false;
  }

  /*
   * Each segment should start with an
   * uppercase letter (place names usually do).
   */
  return segments.every(
    (segment) =>
      /^\s*[A-Z]/.test(segment)
  );
} 