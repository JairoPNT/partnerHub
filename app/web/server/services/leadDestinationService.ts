import {
  assertTransition,
  createBusinessEvent,
  type ActorRef,
  type BusinessEventDraft,
  type TransitionMap
} from "./lifecycle";

export type LeadDestinationState = "DRAFT" | "ACTIVE" | "PAUSED" | "ARCHIVED";

export type LeadDestinationKind =
  | "WHATSAPP"
  | "EXTERNAL_CHECKOUT"
  | "EXTERNAL_FORM"
  | "BOOKING_LINK"
  | "SOCIAL_DM"
  | "PHONE"
  | "OTHER";

export const leadDestinationTransitions: TransitionMap<LeadDestinationState> = {
  DRAFT: ["ACTIVE", "ARCHIVED"],
  ACTIVE: ["PAUSED", "ARCHIVED"],
  PAUSED: ["ACTIVE", "ARCHIVED"],
  ARCHIVED: []
};

export const leadDestinationService = {
  transition(from: LeadDestinationState, to: LeadDestinationState) {
    assertTransition("LeadDestination", leadDestinationTransitions, from, to);
    return to;
  },

  created(
    actor: ActorRef,
    leadDestinationId: string,
    kind: LeadDestinationKind
  ): BusinessEventDraft {
    return createBusinessEvent("lead_destination.created", actor, leadDestinationId, { kind });
  },

  updated(actor: ActorRef, leadDestinationId: string): BusinessEventDraft {
    return createBusinessEvent("lead_destination.updated", actor, leadDestinationId);
  },

  redirected(actor: ActorRef, leadDestinationId: string, channelId: string): BusinessEventDraft {
    return createBusinessEvent(
      "lead.redirected_to_external_destination",
      actor,
      leadDestinationId,
      { channelId, terminalPartnerHubStep: true }
    );
  }
};
