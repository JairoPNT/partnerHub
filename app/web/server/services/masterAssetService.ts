import {
  assertTransition,
  createBusinessEvent,
  type ActorRef,
  type BusinessEventDraft,
  type TransitionMap
} from "./lifecycle";

export type MasterAssetState = "DRAFT" | "VALIDATED" | "DEPRECATED" | "ARCHIVED";

export const masterAssetTransitions: TransitionMap<MasterAssetState> = {
  DRAFT: ["VALIDATED", "ARCHIVED"],
  VALIDATED: ["DEPRECATED", "ARCHIVED"],
  DEPRECATED: ["VALIDATED", "ARCHIVED"],
  ARCHIVED: []
};

export const masterAssetService = {
  transition(from: MasterAssetState, to: MasterAssetState) {
    assertTransition("MasterAsset", masterAssetTransitions, from, to);
    return to;
  },

  created(actor: ActorRef, masterAssetId: string): BusinessEventDraft {
    return createBusinessEvent("master_asset.created", actor, masterAssetId);
  },

  updated(actor: ActorRef, masterAssetId: string, version: number): BusinessEventDraft {
    return createBusinessEvent("master_asset.updated", actor, masterAssetId, { version });
  }
};
