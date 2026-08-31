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
  const activity = parseRscResponse(responses.activity);
  const above = parseComponent(
    responses.components[COMPONENT_IDS.aboveActivity],
  );
  const experience = parseComponent(
    responses.components[COMPONENT_IDS.experience],
  );

  /*
   * These remaining components are deliberately ignored for this
   * first sprint implementation per the user instruction.
   */
  const educationAndCertifications = null;
  const languages = null;
  const skills = null;

  const errors: ProfileResponse["errors"] = [];

  const profile = parseProfileHeader(above);

  if (!profile.headline)
    errors.push({
      field: "profile.headline",
      reason: "Parsing logic not yet implemented",
    });
  if (!profile.location)
    errors.push({
      field: "profile.location",
      reason: "Parsing logic not yet implemented",
    });
  if (!profile.profileImage)
    errors.push({
      field: "profile.profileImage",
      reason: "Parsing logic not yet implemented",
    });

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

  if (errors.length > 0) {
    result.errors = errors;
  }

  return result;
}

/* -------------------------------------------------------------------------- */
/* RSC decoding                                                               */
/* -------------------------------------------------------------------------- */

function parseComponent(response?: string): unknown {
  if (!response) {
    return null;
  }
  return parseRscResponse(response);
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

  const record = root as Record<string, unknown>;

  if (
    record["$type"] === "com.linkedin.rsc.ObservabilityTracking" &&
    record.identifier === identifier
  ) {
    return root;
  }

  if (Array.isArray(root)) {
    for (const item of root) {
      const match = findByObservabilityIdentifier(item, identifier);
      if (match) return match;
    }
    return null;
  }

  for (const child of Object.values(record)) {
    const match = findByObservabilityIdentifier(child, identifier);
    if (match) return match;
  }

  return null;
}

/* -------------------------------------------------------------------------- */
/* Profile Extractors (Stubs for User Implementation)                         */
/* -------------------------------------------------------------------------- */

function parseProfileHeader(
  aboveActivityComponent: unknown,
): ProfileResponse["profile"] {
  // TODO: Traverse aboveActivityComponent to map the target nodes here.
  return {
    name: "Target Name Stub",
    headline: "",
    location: "",
    about: "",
    profileImage: null,
    backgroundImage: null,
  };
}

function parseAbout(aboveActivityComponent: unknown): string {
  // TODO: Traverse aboveActivityComponent to find the About marker here.
  return "";
}

function parseExperience(experienceComponent: unknown): ExperienceItem[] {
  // TODO: Traverse experienceComponent and map to the generic ExperienceItem array structure here.
  const experiences: ExperienceItem[] = [];
  return experiences;
}

/* -------------------------------------------------------------------------- */
/* Disabled Extractors (Per Instructions)                                     */
/* -------------------------------------------------------------------------- */

function parseEducation(component: unknown): EducationItem[] {
  return [];
}

function parseCertifications(component: unknown): CertificationItem[] {
  return [];
}

function parseSkills(component: unknown): string[] {
  return [];
}

function parseLanguages(component: unknown): string[] {
  return [];
}

function parseFeatured(component: unknown): FeaturedItem[] {
  return [];
}

function parseServices(component: unknown): string[] {
  return [];
}