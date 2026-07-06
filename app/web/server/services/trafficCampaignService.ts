import {
  assertTransition,
  createBusinessEvent,
  type ActorRef,
  type BusinessEventDraft,
  type TransitionMap
} from "./lifecycle";

export type TrafficCampaignState =
  | "REQUESTED"
  | "READY"
  | "ENABLED"
  | "PAUSED"
  | "COMPLETED"
  | "CANCELLED";

export const trafficCampaignTransitions: TransitionMap<TrafficCampaignState> = {
  REQUESTED: ["READY", "CANCELLED"],
  READY: ["ENABLED", "CANCELLED"],
  ENABLED: ["PAUSED", "COMPLETED", "CANCELLED"],
  PAUSED: ["ENABLED", "COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: []
};

export const trafficCampaignService = {
  transition(from: TrafficCampaignState, to: TrafficCampaignState) {
    assertTransition("TrafficCampaign", trafficCampaignTransitions, from, to);
    return to;
  },

  requested(actor: ActorRef, campaignId: string): BusinessEventDraft {
    return createBusinessEvent("traffic_campaign.requested", actor, campaignId);
  },

  enabled(actor: ActorRef, campaignId: string, destinationUrl: string): BusinessEventDraft {
    return createBusinessEvent("traffic_campaign.enabled", actor, campaignId, {
      destinationUrl
    });
  }
};
