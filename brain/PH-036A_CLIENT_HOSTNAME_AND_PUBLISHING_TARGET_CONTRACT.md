# PH-036A - Client hostname and PublishingTarget contract

Status: Completed
Date: 2026-08-07
Owner: Codex
Model tier: Balanced

## Objective

Define the smallest backend contract required to provision and publish multiple ecosystems for one entrepreneur without changing current production behavior.

## In scope

- Canonical client hostname rules.
- Stable site identifiers per entrepreneur and ecosystem.
- Minimum PublishingTarget shape.
- State and idempotency rules.
- Compatibility matrix for existing root-domain PRODUCT sites.
- Acceptance tests to be implemented by later tickets.

## Out of scope

- Hostinger or Cloudflare API calls.
- Environment secrets.
- React, Tailwind, UX, or dashboard changes.
- Prisma schema changes or migrations.
- SFTP publication changes.
- Production provisioning.
- Logo upload.

## Canonical identifiers

For an entrepreneur slug such as `lida-castaneda`:

| Ecosystem | siteId | publicHost |
| --- | --- | --- |
| Personal Brand | `lida-castaneda-personal-brand` | `lidacastaneda.pro` |
| Product | `lida-castaneda-product` | `producto.lidacastaneda.pro` |
| Business | `lida-castaneda-business` | `negocio.lidacastaneda.pro` |

Existing site IDs are not renamed automatically. A legacy source such as `lida-castaneda` remains valid and is interpreted as PRODUCT until an explicit migration ticket assigns the new identifier.

`siteId` identifies one generated site, not the entrepreneur. Multiple site IDs must be grouped by a separate immutable `ownerKey`. During the current file-backed phase, `ownerKey` is the linked activation lead UUID. A future database migration may map it to `Entrepreneur.id`, but no ticket may infer ownership by stripping suffixes from `siteId`.

## Minimum PublishingTarget contract

```ts
type ProvisioningState =
  | "PENDING"
  | "HOSTING_CREATED"
  | "DNS_PENDING"
  | "SSL_PENDING"
  | "READY"
  | "FAILED";

type PublishingTarget = {
  ownerKey: string;
  siteId: string;
  ecosystemType: "PRODUCT" | "BUSINESS" | "PERSONAL_BRAND";
  baseDomain: string;
  publicHost: string;
  remoteRoot: string | null;
  provisioningState: ProvisioningState;
  providerResourceId?: string;
  lastErrorCode?: string;
  lastCheckedAt?: string;
};
```

Provider tokens, passwords, raw provider responses, and secret-bearing URLs are forbidden fields.

## Hostname rules

- Personal Brand owns the root domain.
- Product uses the fixed Spanish label `producto`.
- Business uses the fixed Spanish label `negocio`.
- Hostnames are lowercase ASCII and contain no protocol, port, path, query, or fragment.
- `publicHost` must equal the hostname derived from `baseDomain` and `ecosystemType`, unless a separately ticketed exception is explicitly approved.
- A hostname cannot belong to two active PublishingTargets.
- One `ownerKey` may own at most one active PublishingTarget per ecosystem.
- Ownership is explicit; it is never reconstructed from `siteId`, name, email, or domain text.

## Idempotency rules

- Get-before-create is mandatory for Hostinger and DNS providers.
- An existing provider resource is success only when its hostname and destination match the expected target.
- A conflicting existing resource produces a stable conflict error and is never overwritten automatically.
- Retrying a FAILED or intermediate target resumes from observed provider state.
- Provider success is not equivalent to READY; DNS and HTTPS must be observed before READY.

## Publication gate

- Publication is allowed only for READY targets.
- Existing legacy PRODUCT pages without a PublishingTarget continue using the current domain-to-remote-root resolver.
- Verification always uses `publicHost`, never a guessed URL or the physical directory.
- No provisioning action is triggered implicitly by verification.
- New multiecosystem publication state belongs to each PublishingTarget. It must not overwrite the activation lead's single legacy `publicationState` as if it represented all ecosystems.

## Compatibility matrix

| Case | Required behavior |
| --- | --- |
| Existing PRODUCT source without `ecosystemType` | Interpret as PRODUCT and preserve current siteId/domain |
| Existing PRODUCT root-domain publication | Continue through legacy resolver |
| Existing activation lead with one `siteId` | Preserve the link; use the lead UUID as `ownerKey` for additional targets |
| New Product ecosystem | Use `producto.baseDomain` and explicit PublishingTarget |
| New Business ecosystem | Use `negocio.baseDomain` and explicit PublishingTarget |
| New Personal Brand ecosystem | Use root `baseDomain` and explicit PublishingTarget |
| Provider resource already matches | Continue idempotently |
| Provider resource conflicts | Stop with conflict; do not overwrite |
| DNS resolves but HTTPS is not ready | Remain SSL_PENDING |
| Verify button used before publication | Read-only verification; no provisioning or upload |

## Acceptance criteria

- [x] The contract has no secret-bearing fields.
- [x] Legacy PRODUCT publication remains explicitly supported.
- [x] Multiple sites have an explicit owner relation independent from `siteId`.
- [x] Every new ecosystem resolves to one deterministic hostname.
- [x] Retry and conflict behavior are deterministic.
- [x] READY requires hosting, DNS, and HTTPS observations.
- [x] Publication and verification cannot create infrastructure implicitly.
- [x] PH-036B can implement the Hostinger client without changing this contract.

## Compatibility audit result

Reviewed against the current file-backed services on 2026-08-07:

- `productPageSourceService` stores one independent JSON source per `siteId`; suffixed site IDs are compatible.
- generation, history, preview, and verification already isolate artifacts by `siteId`.
- publication currently derives client `remoteRoot` from `site.domain`; PH-036E must replace that behavior only for explicit READY targets.
- verification currently reads `site.domain`; PH-036E must prefer target `publicHost` for provisioned sites.
- `activationLeadService` currently permits only one linked `siteId` and one `publicationState`; these fields remain legacy compatibility fields and cannot model three target states.
- Prisma already models one Entrepreneur with multiple web assets/channels, but no migration or Prisma change is authorized by this ticket.

All PH-036A acceptance criteria are satisfied documentally. No code, provider, UI, Prisma, or production change was performed.

## Completion boundary

PH-036A is closed after review for consistency with PH-032 through PH-035 and the current services. Closing PH-036A makes PH-036B the next eligible ticket only; it does not authorize UI, DNS automation, publication integration, or production changes.
