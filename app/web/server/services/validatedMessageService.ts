import {
  assertTransition,
  createBusinessEvent,
  type ActorRef,
  type BusinessEventDraft,
  type TransitionMap
} from "./lifecycle";

export type ValidatedMessageState = "DRAFT" | "VALIDATED" | "DEPRECATED" | "ARCHIVED";

export const validatedMessageTransitions: TransitionMap<ValidatedMessageState> = {
  DRAFT: ["VALIDATED", "ARCHIVED"],
  VALIDATED: ["DEPRECATED", "ARCHIVED"],
  DEPRECATED: ["VALIDATED", "ARCHIVED"],
  ARCHIVED: []
};

export const validatedMessageService = {
  transition(from: ValidatedMessageState, to: ValidatedMessageState) {
    assertTransition("ValidatedMessage", validatedMessageTransitions, from, to);
    return to;
  },

  created(actor: ActorRef, messageId: string): BusinessEventDraft {
    return createBusinessEvent("validated_message.created", actor, messageId);
  },

  updated(actor: ActorRef, messageId: string): BusinessEventDraft {
    return createBusinessEvent("validated_message.updated", actor, messageId);
  }
};
