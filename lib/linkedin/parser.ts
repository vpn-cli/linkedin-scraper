import type {
  ProfileResponse,
  ExperienceItem,
  EducationItem,
  CertificationItem,
  FeaturedItem,
} from "../../types";

import { COMPONENT_IDS, type ComponentId } from "./requests";
import { parseRscResponse } from "./rsc";

type RawResponses = {
  activity: string;
  components: Partial<Record<ComponentId, string>>;
};

/* -------------------------------------------------------------------------- */
/* Public API                                                                 */
/* -------------------------------------------------------------------------- */

export function parseProfileResponse(responses: RawResponses): ProfileResponse {
  const activity = safeParseRsc(responses.activity);

  const above = parseComponent(
    responses.components[COMPONENT_IDS.aboveActivity],
  );

  const experience = parseComponent(
    responses.components[COMPONENT_IDS.experience],
  );

  // Keep these disabled until their RSC structures are mapped.
  const educationAndCertifications = null;
  const languages = null;
  const skills = null;

  const errors: ProfileResponse["errors"] = [];

  const profile = parseProfileHeader(above);

  profile.about = parseAbout(above);

  const result: ProfileResponse = {
    profile,
    experience: parseExperience(experience),
    education: parseEducation(educationAndCertifications),
    skills: parseSkills(skills),
    certifications: parseCertifications(educationAndCertifications),
    languages: parseLanguages(languages),
    featured: parseFeatured(above),
    services: parseServices(above),
  };

  if (!profile.headline) {
    errors.push({
      field: "profile.headline",
      reason: "Parsing logic not yet implemented",
    });
  }

  if (!profile.location) {
    errors.push({
      field: "profile.location",
      reason: "Parsing logic not yet implemented",
    });
  }

  if (!profile.profileImage) {
    errors.push({
      field: "profile.profileImage",
      reason: "Parsing logic not yet implemented",
    });
  }

  if (errors.length > 0) {
    result.errors = errors;
  }

  return result;
}

/* -------------------------------------------------------------------------- */
/* RSC decoding                                                               */
/* -------------------------------------------------------------------------- */

function safeParseRsc(response?: string): unknown {
  if (!response) {
    return null;
  }

  try {
    return parseRscResponse(response);
  } catch {
    return null;
  }
}

function parseComponent(response?: string): unknown {
  if (!response) {
    return null;
  }

  return safeParseRsc(response);
}

/* -------------------------------------------------------------------------- */
/* Generic traversal                                                          */
/* -------------------------------------------------------------------------- */

export function findByObservabilityIdentifier(
  root: unknown,
  identifier: string,
): unknown | null {
  if (root === null || typeof root !== "object") {
    return null;
  }

  if (Array.isArray(root)) {
    for (const item of root) {
      const match = findByObservabilityIdentifier(item, identifier);

      if (match !== null) {
        return match;
      }
    }

    return null;
  }

  const record = root as Record<string, unknown>;

  if (
    record["$type"] === "com.linkedin.rsc.ObservabilityTracking" &&
    record["identifier"] === identifier
  ) {
    return root;
  }

  for (const child of Object.values(record)) {
    const match = findByObservabilityIdentifier(child, identifier);

    if (match !== null) {
      return match;
    }
  }

  return null;
}

/* -------------------------------------------------------------------------- */
/* Profile                                                                    */
/* -------------------------------------------------------------------------- */

function parseProfileHeader(
  _aboveActivityComponent: unknown,
): ProfileResponse["profile"] {
  return {
    name: "",
    headline: "",
    location: "",
    about: "",
    profileImage: null,
    backgroundImage: null,
  };
}

function parseAbout(_aboveActivityComponent: unknown): string {
  return "";
}

/* -------------------------------------------------------------------------- */
/* Experience                                                                 */
/* -------------------------------------------------------------------------- */

function parseExperience(_experienceComponent: unknown): ExperienceItem[] {
  return [];
}

/* -------------------------------------------------------------------------- */
/* Remaining extractors                                                       */
/* -------------------------------------------------------------------------- */

function parseEducation(_component: unknown): EducationItem[] {
  return [];
}

function parseCertifications(_component: unknown): CertificationItem[] {
  return [];
}

function parseSkills(_component: unknown): string[] {
  return [];
}

function parseLanguages(_component: unknown): string[] {
  return [];
}

function parseFeatured(_component: unknown): FeaturedItem[] {
  return [];
}

function parseServices(_component: unknown): string[] {
  return [];
}
