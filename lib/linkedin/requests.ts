import { randomBytes } from "crypto";

const RSC_COMPONENT_URL =
  "https://www.linkedin.com/flagship-web/rsc-action/actions/component";

export const COMPONENT_IDS = {
  activity:
    "com.linkedin.sdui.generated.profile.dsl.impl.profileCardsActivity",

  aboveActivity:
    "com.linkedin.sdui.generated.profile.dsl.impl.profileCardsAboveActivity",

  experience:
    "com.linkedin.sdui.generated.profile.dsl.impl.profileCardsExperienceOnly",

  belowActivityPart1:
    "com.linkedin.sdui.generated.profile.dsl.impl.profileCardsBelowActivityPart1WithoutExp",

  belowActivityPart4:
    "com.linkedin.sdui.generated.profile.dsl.impl.profileCardsBelowActivityPart4",

  belowActivityPart7:
    "com.linkedin.sdui.generated.profile.dsl.impl.profileCardsBelowActivityPart7",
} as const;

export type ComponentId =
  (typeof COMPONENT_IDS)[keyof typeof COMPONENT_IDS];

export interface LinkedInRequest {
  url: string;
  body: Record<string, unknown>;
}

function createParentSpanId(): string {
  return randomBytes(8).toString("base64");
}

function createComponentUrl(
  componentId: string
): string {
  const params = new URLSearchParams({
    componentId,
    sduiid: componentId,
    parentSpanId: createParentSpanId(),
  });

  return `${RSC_COMPONENT_URL}?${params.toString()}`;
}

function createBinding(
  key: string
): Record<string, unknown> {
  return {
    type: "com.linkedin.sdui.components.core.BindingImpl",
    value: {
      key,
      namespace: "MemoryNamespace",
    },
  };
}

/**
 * The profile component requests captured in the HAR all
 * use the same profileComponentState shape.
 *
 * Only the vanity name changes between profiles.
 */
function createProfileComponentState(
  vanityName: string
): Record<string, unknown> {
  const suffix = `${vanityName}ProfileComponentState`;

  return {
    profileId: vanityName,

    shouldRefreshScreenOnReappear: createBinding(
      `ProfileComponentStateShouldRefreshScreen${suffix}`
    ),

    shouldFetchFromCache: createBinding(
      `ProfileComponentStateFetchFromCache${suffix}`
    ),

    loadedSections: createBinding(
      `ProfileComponentStateLoadedProfileSections${suffix}`
    ),

    shouldDisplayTabAnchors: createBinding(
      `ProfileComponentStateShouldDisplayTabAnchors${suffix}`
    ),

    shouldReloadTopCardOnReappear: createBinding(
      `ProfileComponentStateShouldReloadTopCardOnReappear${suffix}`
    ),

    deferredTopCardReloadProfileId: createBinding(
      `ProfileComponentStateDeferredTopCardReloadProfileId${suffix}`
    ),

    shouldDisplayStickyHeader: createBinding(
      `ProfileComponentStateShouldDisplayStickyHeader${suffix}`
    ),

    shouldRefreshLanguageDetailScreen: createBinding(
      `ProfileComponentStateShouldRefreshLanguageDetails${suffix}`
    ),

    lastPerformedActionRef: createBinding(
      `ProfileComponentStateLastPerformedActionRef${suffix}`
    ),

    shouldFocusOnReappear: createBinding(
      `ProfileComponentStateShouldFocusOnReappear${suffix}`
    ),

    shouldFocusFeaturedOnReappear: createBinding(
      `ProfileComponentStateShouldFocusFeaturedOnReappear${suffix}`
    ),

    lastFeaturedActionRef: createBinding(
      `ProfileComponentStateLastFeaturedActionRef${suffix}`
    ),

    shouldHideProfileCards: createBinding(
      `ProfileComponentStateProfileHideCards${suffix}`
    ),
  };
}

function createReplaceableSectionArgs(
  vanityName: string,
  vieweeProfileId: string
): Record<string, unknown> {
  return {
    vanityName,
    hideCardsForGoldenGate: false,
    shouldSetupReplaceableComponent: true,
    vieweeProfileId,
    isSelfView: false,
    isSelfViewResolved: false,
  };
}

/**
 * Initial profile activity request.
 *
 * This is the simplest request from the HAR and does not
 * require vieweeProfileId.
 */
export function buildActivityRequest(
  vanityName: string
): LinkedInRequest {
  const componentId = COMPONENT_IDS.activity;

  return {
    url: createComponentUrl(componentId),

    body: {
      clientArguments: {
        payload: {
          isSelfView: false,
          vanityName,
        },

        states: [],

        requestMetadata: {
          $type: "proto.sdui.common.RequestMetadata",
        },

        screenId:
          "com.linkedin.sdui.flagshipnav.home.Home",

        knownTemplateIds: [],
      },
    },
  };
}

/**
 * All lazy-loaded profile-card requests share this payload.
 */
export function buildProfileComponentRequest(
  componentId: ComponentId,
  vanityName: string,
  vieweeProfileId: string
): LinkedInRequest {
  return {
    url: createComponentUrl(componentId),

    body: {
      clientArguments: {
        payload: {
          isSelfView: false,
          vanityName,

          replaceableSectionArgs:
            createReplaceableSectionArgs(
              vanityName,
              vieweeProfileId
            ),

          profileComponentState:
            createProfileComponentState(
              vanityName
            ),
        },

        states: [],

        requestMetadata: {
          $type: "proto.sdui.common.RequestMetadata",
        },

        screenId:
          "com.linkedin.sdui.flagshipnav.profile.Profile",

        knownTemplateIds: [],
      },
    },
  };
}

/**
 * These are the components that actually map to fields
 * in our ProfileResponse contract.
 *
 * We intentionally do not request Part2/Part3/Part5/Part6
 * because the supplied contract does not consume their data.
 */
export const PROFILE_COMPONENTS: ComponentId[] = [
  COMPONENT_IDS.aboveActivity,
  COMPONENT_IDS.experience,
  COMPONENT_IDS.belowActivityPart1,
  COMPONENT_IDS.belowActivityPart4,
  COMPONENT_IDS.belowActivityPart7,
];