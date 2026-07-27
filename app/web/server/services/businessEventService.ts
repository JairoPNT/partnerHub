import type { ActorRef, BusinessEventDraft, BusinessEventName } from "./lifecycle";
import { createBusinessEvent } from "./lifecycle";

export const minimumBusinessEvents: readonly BusinessEventName[] = [
  "entrepreneur.created",
  "entrepreneur.package_selected",
  "entrepreneur.data_submitted",
  "web_asset.requested",
  "personalized_channel.created",
  "personalized_channel.published",
  "personalized_channel.updated_from_master",
  "lead_destination.created",
  "lead_destination.updated",
  "master_asset.created",
  "master_asset.updated",
  "validated_message.created",
  "validated_message.updated",
  "traffic_campaign.requested",
  "traffic_campaign.enabled",
  "lead.redirected_to_external_destination"
];

export const businessEventService = {
  record(
    name: BusinessEventName,
    actor: ActorRef,
    subjectId?: string,
    payload?: Record<string, unknown>
  ): BusinessEventDraft {
    return createBusinessEvent(name, actor, subjectId, payload);
  },

  isTerminalRoutingEvent(event: BusinessEventDraft) {
    return event.name === "lead.redirected_to_external_destination";
  }
};
