import {
  assertTransition,
  createBusinessEvent,
  type ActorRef,
  type BusinessEventDraft,
  type TransitionMap
} from "./lifecycle";

export type PersonalizedChannelState =
  | "REQUESTED"
  | "DRAFT"
  | "READY_FOR_REVIEW"
  | "PUBLISHED"
  | "NEEDS_UPDATE"
  | "PAUSED"
  | "ARCHIVED";

export const personalizedChannelTransitions: TransitionMap<PersonalizedChannelState> = {
  REQUESTED: ["DRAFT", "ARCHIVED"],
  DRAFT: ["READY_FOR_REVIEW", "ARCHIVED"],
  READY_FOR_REVIEW: ["PUBLISHED", "DRAFT", "ARCHIVED"],
  PUBLISHED: ["NEEDS_UPDATE", "PAUSED", "ARCHIVED"],
  NEEDS_UPDATE: ["READY_FOR_REVIEW", "ARCHIVED"],
  PAUSED: ["PUBLISHED", "ARCHIVED"],
  ARCHIVED: []
};

export const personalizedChannelService = {
  transition(from: PersonalizedChannelState, to: PersonalizedChannelState) {
    assertTransition("PersonalizedChannel", personalizedChannelTransitions, from, to);
    return to;
  },

  created(actor: ActorRef, channelId: string): BusinessEventDraft {
    return createBusinessEvent("personalized_channel.created", actor, channelId);
  },

  published(actor: ActorRef, channelId: string, publicUrl: string): BusinessEventDraft {
    return createBusinessEvent("personalized_channel.published", actor, channelId, {
      publicUrl
    });
  },

  updatedFromMaster(actor: ActorRef, channelId: string, masterAssetId: string): BusinessEventDraft {
    return createBusinessEvent("personalized_channel.updated_from_master", actor, channelId, {
      masterAssetId
    });
  }
};
