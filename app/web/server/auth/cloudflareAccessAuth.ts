import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey, type JWTPayload } from "jose";
import { z } from "zod";

const configurationSchema = z.object({
  teamDomain: z.string().trim().min(1),
  audience: z.string().trim().min(1)
});

export type CloudflareAccessIdentity = {
  subject: string;
  email?: string;
  payload: JWTPayload;
};

export class CloudflareAccessAuthError extends Error {
  readonly code: "ACCESS_TOKEN_MISSING" | "ACCESS_TOKEN_INVALID";

  constructor(code: "ACCESS_TOKEN_MISSING" | "ACCESS_TOKEN_INVALID") {
    super(code);
    this.name = "CloudflareAccessAuthError";
    this.code = code;
  }
}

function normalizeTeamDomain(value: string) {
  const candidate = value.includes("://") ? value : `https://${value}`;
  const url = new URL(candidate);
  if (url.protocol !== "https:" || url.pathname !== "/" || url.search || url.hash) {
    throw new Error("CLOUDFLARE_ACCESS_TEAM_DOMAIN must be an HTTPS origin without a path.");
  }
  return url.origin;
}

export function getCloudflareAccessConfig(source: NodeJS.ProcessEnv = process.env) {
  const parsed = configurationSchema.parse({
    teamDomain: source.CLOUDFLARE_ACCESS_TEAM_DOMAIN,
    audience: source.CLOUDFLARE_ACCESS_AUD
  });
  return {
    teamDomain: normalizeTeamDomain(parsed.teamDomain),
    audience: parsed.audience
  };
}

const remoteKeySets = new Map<string, JWTVerifyGetKey>();

function remoteKeySet(teamDomain: string) {
  const certsUrl = `${teamDomain}/cdn-cgi/access/certs`;
  const existing = remoteKeySets.get(certsUrl);
  if (existing) return existing;
  const created = createRemoteJWKSet(new URL(certsUrl));
  remoteKeySets.set(certsUrl, created);
  return created;
}

export async function verifyCloudflareAccessToken(
  token: string,
  configuration = getCloudflareAccessConfig(),
  keyResolver: JWTVerifyGetKey = remoteKeySet(configuration.teamDomain)
): Promise<CloudflareAccessIdentity> {
  try {
    const { payload } = await jwtVerify(token, keyResolver, {
      issuer: configuration.teamDomain,
      audience: configuration.audience,
      algorithms: ["RS256"]
    });
    if (!payload.sub) throw new Error("Cloudflare Access JWT has no subject.");
    return {
      subject: payload.sub,
      ...(typeof payload.email === "string" ? { email: payload.email } : {}),
      payload
    };
  } catch {
    throw new CloudflareAccessAuthError("ACCESS_TOKEN_INVALID");
  }
}

export async function authenticateCloudflareAccessRequest(
  request: Request,
  configuration = getCloudflareAccessConfig(),
  keyResolver?: JWTVerifyGetKey
) {
  const token = request.headers.get("cf-access-jwt-assertion");
  if (!token) throw new CloudflareAccessAuthError("ACCESS_TOKEN_MISSING");
  return verifyCloudflareAccessToken(token, configuration, keyResolver);
}
