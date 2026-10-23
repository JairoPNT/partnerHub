import type {
  MasterSitesBusinessCommandResult,
  MasterSitesBusinessPrepareTargetRequest,
  MasterSitesBusinessPublishRequest,
  MasterSitesBusinessReadResponse
} from "../shared/master-sites-business-contract";

export type BusinessAction = "prepare" | "publish";
export type BusinessCommand = {
  action: BusinessAction;
  body: MasterSitesBusinessPrepareTargetRequest | MasterSitesBusinessPublishRequest;
};
export type BusinessRowResult = {
  status: "success" | "failed" | "uncertain";
  command: BusinessCommand;
  result?: MasterSitesBusinessCommandResult;
  error?: string;
  acceptedReadStart?: number;
};
export type BusinessDeliveryState = {
  data: MasterSitesBusinessReadResponse | null;
  loading: boolean;
  error: string | null;
  access: "granted" | "unauthorized" | "forbidden" | "unknown";
  selectedIds: string[];
  updateConfirmedIds: string[];
  selectionError: string | null;
  review: { action: BusinessAction; ids: string[]; templateRevision: string } | null;
  results: Record<string, BusinessRowResult>;
  history: Record<string, BusinessRowResult[]>;
  latestReadStarted: number;
  latestReadCompleted: number;
  needsRefresh: boolean;
};

export type BusinessDeliveryEvent =
  | { type: "loading"; clear?: boolean }
  | { type: "readStarted"; requestId: number }
  | { type: "read"; data: MasterSitesBusinessReadResponse; requestId?: number }
  | { type: "error"; error: string; access?: BusinessDeliveryState["access"] }
  | { type: "toggle"; id: string }
  | { type: "confirmUpdate"; id: string; checked: boolean }
  | { type: "review"; action: BusinessAction }
  | { type: "closeReview" }
  | { type: "result"; command: BusinessCommand; result: MasterSitesBusinessCommandResult }
  | { type: "failed"; command: BusinessCommand; error: string }
  | { type: "uncertain"; command: BusinessCommand }
  | { type: "conflict"; id: string }
  | { type: "clearResult"; id: string }
  | { type: "continue"; id: string };

export function createBusinessDeliveryState(): BusinessDeliveryState {
  return {
    data: null, loading: false, error: null, access: "unknown", selectedIds: [],
    updateConfirmedIds: [], selectionError: null, review: null, results: {}, history: {},
    latestReadStarted: 0, latestReadCompleted: 0, needsRefresh: false
  };
}

export function businessContinuationAction(state: BusinessDeliveryState, id: string): BusinessAction | null {
  const receipt = state.results[id];
  const partner = state.data?.partners.find((item) => item.activationLeadId === id);
  if (!receipt || receipt.status !== "success" || receipt.acceptedReadStart === undefined
    || state.latestReadCompleted <= receipt.acceptedReadStart || !partner?.reviewRevision
    || !state.data?.template.available || state.access !== "granted" || state.loading || state.needsRefresh) return null;
  if (receipt.command.action === "prepare" && receipt.result?.outcome === "TARGET_PENDING"
    && ["TARGET_PENDING", "TARGET_REQUIRED"].includes(partner.status) && partner.canPrepareTarget) return "prepare";
  if (receipt.command.action === "publish" && ["ENQUEUED", "ALREADY_SCHEDULED", "ALREADY_CURRENT"].includes(receipt.result?.outcome ?? "")
    && ["FAILED", "CURRENT"].includes(partner.status) && partner.canPublish) return "publish";
  return null;
}

export function reduceBusinessDeliveryState(state: BusinessDeliveryState, event: BusinessDeliveryEvent): BusinessDeliveryState {
  switch (event.type) {
    case "loading":
      return { ...state, loading: true, error: null, ...(event.clear ? { data: null, selectedIds: [], updateConfirmedIds: [], review: null } : {}) };
    case "readStarted":
      return { ...state, latestReadStarted: Math.max(state.latestReadStarted, event.requestId) };
    case "read": {
      const known = new Set(event.data.partners.map((partner) => partner.activationLeadId));
      const selectionStable = state.data?.template.revision === event.data.template.revision
        && state.data?.template.available === event.data.template.available
        && state.selectedIds.every((id) => {
          const before = state.data?.partners.find((partner) => partner.activationLeadId === id);
          const after = event.data.partners.find((partner) => partner.activationLeadId === id);
          return before && after && before.reviewRevision === after.reviewRevision && before.status === after.status
            && before.siteId === after.siteId && before.publicHost === after.publicHost
            && before.canPrepareTarget === after.canPrepareTarget && before.canPublish === after.canPublish;
        });
      const reviewStable = selectionStable && state.review;
      return {
        ...state, data: event.data, loading: false, error: null, access: "granted", needsRefresh: false,
        latestReadCompleted: Math.max(state.latestReadCompleted, event.requestId ?? 0),
        selectedIds: selectionStable ? state.selectedIds.filter((id) => {
          if (!known.has(id)) return false;
          const result = state.results[id];
          return result?.status !== "success" || (result.command.action === "prepare" && event.data.partners.find((partner) => partner.activationLeadId === id)?.canPublish);
        }) : [],
        updateConfirmedIds: selectionStable ? state.updateConfirmedIds : [],
        review: reviewStable ? state.review : null, selectionError: null
      };
    }
    case "error":
      return {
        ...createBusinessDeliveryState(), error: event.error, access: event.access ?? "unknown",
        results: event.access === "forbidden" || event.access === "unauthorized" ? {} : state.results,
        history: event.access === "forbidden" || event.access === "unauthorized" ? {} : state.history,
        latestReadStarted: state.latestReadStarted, latestReadCompleted: state.latestReadCompleted
      };
    case "toggle": {
      const partner = state.data?.partners.find((item) => item.activationLeadId === event.id);
      const prior = state.results[event.id];
      if (!partner || prior?.status === "uncertain" || (prior?.status === "success" && (prior.command.action === "publish" || !partner.canPublish))) return state;
      if (state.selectedIds.includes(event.id)) return {
        ...state, selectedIds: state.selectedIds.filter((id) => id !== event.id),
        updateConfirmedIds: state.updateConfirmedIds.filter((id) => id !== event.id), review: null, selectionError: null
      };
      if (state.selectedIds.length >= 10) return { ...state, selectionError: "Puedes seleccionar hasta 10 partners." };
      return { ...state, selectedIds: [...state.selectedIds, event.id], review: null, selectionError: null };
    }
    case "confirmUpdate":
      return {
        ...state, updateConfirmedIds: event.checked
          ? [...new Set([...state.updateConfirmedIds, event.id])]
          : state.updateConfirmedIds.filter((id) => id !== event.id), review: null
      };
    case "review":
      if (!state.data?.template.revision || !state.selectedIds.length || state.needsRefresh) return state;
      return { ...state, review: { action: event.action, ids: [...state.selectedIds], templateRevision: state.data.template.revision } };
    case "closeReview":
      return { ...state, review: null };
    case "result": {
      if (event.result.activationLeadId !== event.command.body.activationLeadId) {
        return reduceBusinessDeliveryState(state, { type: "uncertain", command: event.command });
      }
      const success = !["BLOCKED", "RETRY_REQUIRED"].includes(event.result.outcome);
      return {
        ...state,
        needsRefresh: state.needsRefresh || !success,
        results: { ...state.results, [event.command.body.activationLeadId]: {
          status: success ? "success" : "failed", command: event.command, result: event.result,
          acceptedReadStart: success ? state.latestReadStarted : undefined
        } },
        selectedIds: success ? state.selectedIds.filter((id) => id !== event.command.body.activationLeadId) : state.selectedIds
      };
    }
    case "failed":
      return { ...state, needsRefresh: true, results: { ...state.results, [event.command.body.activationLeadId]: { status: "failed", command: event.command, error: event.error } } };
    case "uncertain":
      return { ...state, results: { ...state.results, [event.command.body.activationLeadId]: { status: "uncertain", command: event.command, error: "No llegó una respuesta. Reintenta solo esta solicitud con el mismo identificador." } } };
    case "conflict":
      return { ...state, needsRefresh: true, review: null, selectedIds: [], updateConfirmedIds: [], error: "La revisión cambió. Actualiza antes de confirmar de nuevo." };
    case "clearResult": {
      const results = { ...state.results };
      delete results[event.id];
      return { ...state, results, history: state.results[event.id]
        ? { ...state.history, [event.id]: [...(state.history[event.id] ?? []), state.results[event.id]] }
        : state.history };
    }
    case "continue":
      return businessContinuationAction(state, event.id)
        ? reduceBusinessDeliveryState(state, { type: "clearResult", id: event.id })
        : state;
  }
}

export function buildBusinessCommands(state: BusinessDeliveryState, action: BusinessAction, uuid: () => string): BusinessCommand[] {
  if (!state.data?.template.available || !state.data.template.revision || state.needsRefresh || state.access !== "granted") return [];
  return state.selectedIds.flatMap((id): BusinessCommand[] => {
    const partner = state.data?.partners.find((item) => item.activationLeadId === id);
    if (!partner?.reviewRevision || state.results[id]?.status === "uncertain" || state.results[id]?.status === "failed"
      || (state.results[id]?.status === "success" && state.results[id].command.action === action)) return [];
    if (action === "prepare" && !partner.canPrepareTarget) return [];
    if (action === "publish" && (!partner.canPublish || (partner.status === "CURRENT" && !state.updateConfirmedIds.includes(id)))) return [];
    const common = { requestId: uuid(), activationLeadId: id, templateId: "ganomaster-business" as const, expectedRevision: partner.reviewRevision };
    return [{ action, body: action === "prepare"
      ? { ...common, confirmation: "PREPARE_SELECTED_BUSINESS_TARGET" }
      : { ...common, confirmation: "PUBLISH_SELECTED_BUSINESS_TEMPLATE", updateExisting: partner.status === "CURRENT" }
    }];
  });
}

export function safeBusinessPreviewUrl(value: string | null, origin: string): string | null {
  if (!value || value.startsWith("//") || value.includes("\\")) return null;
  try {
    const url = new URL(value, origin);
    if (url.origin !== origin || (!value.startsWith("/") && url.protocol !== "https:")) return null;
    return value.startsWith("/") ? value : url.href;
  } catch { return null; }
}

export function businessPollingDelay(data: MasterSitesBusinessReadResponse | null, failures: number): number | null {
  if (!data?.partners.some((partner) => partner.currentJob && ["QUEUED", "RUNNING"].includes(partner.currentJob.status))) return null;
  return Math.min(30000, 3000 * 2 ** Math.min(failures, 4));
}
