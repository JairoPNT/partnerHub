import type { JWTVerifyGetKey } from "jose";
import {
  authenticateCloudflareAccessRequest, CloudflareAccessAuthError, getCloudflareAccessConfig,
  type CloudflareAccessIdentity
} from "@/server/auth/cloudflareAccessAuth";

const errorStatuses = {
  ACCESS_TOKEN_MISSING: 401,
  ACCESS_TOKEN_INVALID: 401,
  MASTER_SITES_FORBIDDEN: 403,
  MASTER_SITES_ORIGIN_FORBIDDEN: 403,
  MASTER_SITES_JSON_REQUIRED: 400,
  MASTER_SITES_AUTH_CONFIGURATION_INVALID: 403
} as const;

export type MasterSitesOperatorAuthErrorCode = keyof typeof errorStatuses;

/** Safe for route adapters: return {error: error.code} with error.status, not raw exceptions. */
export class MasterSitesOperatorAuthError extends Error {
  readonly status: 400 | 401 | 403;
  readonly code: MasterSitesOperatorAuthErrorCode;

  constructor(code: MasterSitesOperatorAuthErrorCode) {
    super(code);
    this.name = "MasterSitesOperatorAuthError";
    this.code = code;
    this.status = errorStatuses[code];
  }
}

export type MasterSitesOperatorAuthorizerOptions = {
  source?: NodeJS.ProcessEnv;
  keyResolver?: JWTVerifyGetKey;
};

/** Inject local test keys/config without replacing signature, issuer, audience or expiry verification. */
export function createMasterSitesOperatorAuthorizer(options: MasterSitesOperatorAuthorizerOptions = {}) {
  return async (request: Request): Promise<CloudflareAccessIdentity> => {
    const source = options.source ?? process.env;
    let configuration: ReturnType<typeof getCloudflareAccessConfig>;
    try {
      // Intentionally the existing administrative audience, not the publication service audience.
      configuration = getCloudflareAccessConfig(source);
    } catch {
      throw new MasterSitesOperatorAuthError("MASTER_SITES_AUTH_CONFIGURATION_INVALID");
    }
    let identity: CloudflareAccessIdentity;
    try {
      identity = await authenticateCloudflareAccessRequest(request, configuration, options.keyResolver);
    } catch (error) {
      throw new MasterSitesOperatorAuthError(error instanceof CloudflareAccessAuthError ? error.code : "ACCESS_TOKEN_INVALID");
    }
    const allowlist = new Set((source.MASTER_SITES_SUPER_ADMIN_EMAILS ?? "").split(",").map((email) => email.trim().toLowerCase()).filter(Boolean));
    const email = identity.email?.trim().toLowerCase();
    if (identity.identityType !== "HUMAN" || !email || !allowlist.has(email)) {
      throw new MasterSitesOperatorAuthError("MASTER_SITES_FORBIDDEN");
    }
    if (request.method === "POST") {
      if (request.headers.get("origin") !== "https://app.partnerhub.club") {
        throw new MasterSitesOperatorAuthError("MASTER_SITES_ORIGIN_FORBIDDEN");
      }
      const mediaType = request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase();
      if (mediaType !== "application/json") throw new MasterSitesOperatorAuthError("MASTER_SITES_JSON_REQUIRED");
    }
    return identity;
  };
}

export const authorizeMasterSitesOperator: (request: Request) => Promise<CloudflareAccessIdentity> = createMasterSitesOperatorAuthorizer();
