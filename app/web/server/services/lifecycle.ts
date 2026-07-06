export type BusinessEventName =
  | "entrepreneur.created"
  | "entrepreneur.package_selected"
  | "entrepreneur.data_submitted"
  | "web_asset.requested"
  | "personalized_channel.created"
  | "personalized_channel.published"
  | "personalized_channel.updated_from_master"
  | "lead_destination.created"
  | "lead_destination.updated"
  | "master_asset.created"
  | "master_asset.updated"
  | "validated_message.created"
  | "validated_message.updated"
  | "traffic_campaign.requested"
  | "traffic_campaign.enabled"
  | "lead.redirected_to_external_destination";

export type ActorRef = {
  type: "admin" | "operator" | "entrepreneur" | "system" | "integration";
  id?: string;
};

export type BusinessEventDraft = {
  name: BusinessEventName;
  actor: ActorRef;
  subjectId?: string;
  payload?: Record<string, unknown>;
};

export type TransitionMap<TStatus extends string> = Record<TStatus, readonly TStatus[]>;

export function assertTransition<TStatus extends string>(
  entityName: string,
  transitions: TransitionMap<TStatus>,
  from: TStatus,
  to: TStatus
) {
  if (from === to) {
    return;
  }

  if (!transitions[from]?.includes(to)) {
    throw new Error(`${entityName} cannot transition from ${from} to ${to}`);
  }
}

export function createBusinessEvent(
  name: BusinessEventName,
  actor: ActorRef,
  subjectId?: string,
  payload: Record<string, unknown> = {}
): BusinessEventDraft {
  return {
    name,
    actor,
    subjectId,
    payload
  };
}
