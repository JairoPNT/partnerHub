import { posix } from "node:path";

export type PublicationTargetSnapshot = {
  siteId: string;
  publicHost: string;
  remoteRoot: string | null;
  provisioningState: string;
};

export type ResolvedPublicationTarget = {
  mode: "LEGACY" | "PROVISIONED";
  remoteRoot: string;
  publicHost: string | null;
};

export class PublicationTargetError extends Error {
  readonly code: "PUBLICATION_TARGET_NOT_READY" | "PUBLICATION_TARGET_INVALID";

  constructor(
    code: "PUBLICATION_TARGET_NOT_READY" | "PUBLICATION_TARGET_INVALID",
    message: string
  ) {
    super(message);
    this.name = "PublicationTargetError";
    this.code = code;
  }
}

function validRemoteRoot(value: string) {
  const normalized = posix.normalize(value).replace(/\/+$/, "");
  if (!normalized.startsWith("/") || normalized === "/") {
    throw new PublicationTargetError(
      "PUBLICATION_TARGET_INVALID",
      "Provisioned publication target has an invalid remote root."
    );
  }
  return normalized;
}

export function resolvePublicationTarget(
  legacyRemoteRoot: string,
  target: PublicationTargetSnapshot | null
): ResolvedPublicationTarget {
  if (!target) {
    return { mode: "LEGACY", remoteRoot: validRemoteRoot(legacyRemoteRoot), publicHost: null };
  }

  if (target.provisioningState !== "READY") {
    throw new PublicationTargetError(
      "PUBLICATION_TARGET_NOT_READY",
      `Publishing target ${target.siteId} is not READY.`
    );
  }

  if (!target.remoteRoot) {
    throw new PublicationTargetError(
      "PUBLICATION_TARGET_INVALID",
      `Publishing target ${target.siteId} has no remote root.`
    );
  }

  return {
    mode: "PROVISIONED",
    remoteRoot: validRemoteRoot(target.remoteRoot),
    publicHost: target.publicHost
  };
}

export function resolveVerificationHost(
  legacyPublicHost: string | null,
  target: PublicationTargetSnapshot | null
) {
  return target?.publicHost ?? legacyPublicHost;
}
