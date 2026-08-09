export type SafePublishingTarget = {
  siteId: string;
  ecosystemType: string;
  baseDomain: string;
  publicHost: string;
  provisioningState: string;
  hostingerState: string;
  dnsState: string;
  sslState: string;
  lastErrorCode?: string;
  lastCheckedAt?: string;
  createdAt: string;
  updatedAt: string;
};

type InternalTarget = SafePublishingTarget & {
  ownerKey?: string;
  remoteRoot?: string | null;
  dnsRecordId?: string;
  [key: string]: unknown;
};

export function toSafePublishingTarget(target: InternalTarget): SafePublishingTarget {
  return {
    siteId: target.siteId,
    ecosystemType: target.ecosystemType,
    baseDomain: target.baseDomain,
    publicHost: target.publicHost,
    provisioningState: target.provisioningState,
    hostingerState: target.hostingerState,
    dnsState: target.dnsState,
    sslState: target.sslState,
    ...(target.lastErrorCode ? { lastErrorCode: target.lastErrorCode } : {}),
    ...(target.lastCheckedAt ? { lastCheckedAt: target.lastCheckedAt } : {}),
    createdAt: target.createdAt,
    updatedAt: target.updatedAt
  };
}

export function safeProvisioningError(error: unknown) {
  if (error && typeof error === "object" && "code" in error && typeof error.code === "string") {
    const code = error.code;
    if (code === "PROVISIONING_TARGET_CONFLICT") return { status: 409, code };
    if (code === "PROVISIONING_PROVIDER_FAILED") return { status: 502, code };
  }
  return { status: 500, code: "PROVISIONING_REQUEST_FAILED" };
}

export function withServerProvisioningIpv4(body: unknown, ipv4: string) {
  const input = body && typeof body === "object" && !Array.isArray(body) ? body : {};
  return { ...input, ipv4 };
}
