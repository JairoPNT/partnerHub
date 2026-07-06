import {
  assertTransition,
  createBusinessEvent,
  type ActorRef,
  type BusinessEventDraft,
  type TransitionMap
} from "./lifecycle";

export type WebAssetPackageState =
  | "DRAFT"
  | "SELECTED"
  | "DATA_REQUIRED"
  | "READY_FOR_ASSET"
  | "ACTIVE"
  | "PAUSED"
  | "ARCHIVED";

export type WebAssetPackageKind = "PRODUCT_SALES" | "VSL_RECRUITMENT" | "FULL_COMBO";

export const webAssetPackageTransitions: TransitionMap<WebAssetPackageState> = {
  DRAFT: ["SELECTED", "ARCHIVED"],
  SELECTED: ["DATA_REQUIRED", "READY_FOR_ASSET", "ARCHIVED"],
  DATA_REQUIRED: ["READY_FOR_ASSET", "ARCHIVED"],
  READY_FOR_ASSET: ["ACTIVE", "ARCHIVED"],
  ACTIVE: ["PAUSED", "ARCHIVED"],
  PAUSED: ["ACTIVE", "ARCHIVED"],
  ARCHIVED: []
};

export const webAssetPackageService = {
  transition(from: WebAssetPackageState, to: WebAssetPackageState) {
    assertTransition("WebAssetPackage", webAssetPackageTransitions, from, to);
    return to;
  },

  requestWebAsset(
    actor: ActorRef,
    packageId: string,
    kind: WebAssetPackageKind
  ): BusinessEventDraft {
    return createBusinessEvent("web_asset.requested", actor, packageId, { kind });
  }
};
