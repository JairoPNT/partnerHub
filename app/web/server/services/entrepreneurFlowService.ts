import {
  assertTransition,
  createBusinessEvent,
  type ActorRef,
  type BusinessEventDraft,
  type TransitionMap
} from "./lifecycle";

export type EntrepreneurState = "INVITED" | "ACTIVE" | "PAUSED" | "ARCHIVED";

export const entrepreneurTransitions: TransitionMap<EntrepreneurState> = {
  INVITED: ["ACTIVE", "ARCHIVED"],
  ACTIVE: ["PAUSED", "ARCHIVED"],
  PAUSED: ["ACTIVE", "ARCHIVED"],
  ARCHIVED: []
};

export const entrepreneurFlowService = {
  transition(from: EntrepreneurState, to: EntrepreneurState) {
    assertTransition("Entrepreneur", entrepreneurTransitions, from, to);
    return to;
  },

  created(actor: ActorRef, entrepreneurId: string): BusinessEventDraft {
    return createBusinessEvent("entrepreneur.created", actor, entrepreneurId);
  },

  packageSelected(actor: ActorRef, entrepreneurId: string, packageId: string): BusinessEventDraft {
    return createBusinessEvent("entrepreneur.package_selected", actor, entrepreneurId, {
      packageId
    });
  },

  dataSubmitted(actor: ActorRef, entrepreneurId: string): BusinessEventDraft {
    return createBusinessEvent("entrepreneur.data_submitted", actor, entrepreneurId);
  }
};
