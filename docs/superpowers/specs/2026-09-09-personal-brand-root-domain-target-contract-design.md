# Personal Brand Root-Domain Target Contract Design

## Purpose

Define one durable, tenant-isolated hostname policy for the three currently
offered PartnerHub ecosystems. The policy must let a customer use the apex for
Personal Brand while preserving fixed commercial subdomains for Product and
Business. It must remain structurally extensible to a future registered
subdomain without enabling arbitrary hostnames today.

## Approved route policy

For a partner base domain `dominio.pro`:

| Ecosystem | Canonical host |
| --- | --- |
| `PERSONAL_BRAND` | `dominio.pro` |
| `PRODUCT` | `producto.dominio.pro` |
| `BUSINESS` | `negocio.dominio.pro` |

The apex is a special route, not a normal subdomain. Its behavior is derived
from the partner's active entitlement set:

1. If `PERSONAL_BRAND` is active, the apex serves Personal Brand.
2. Otherwise, if `BUSINESS` is active, the apex redirects to
   `negocio.dominio.pro`.
3. Otherwise, if `PRODUCT` is active, the apex redirects to
   `producto.dominio.pro`.
4. An inactive known subdomain redirects to the resolved apex destination.
5. An active Product or Business subdomain serves only its own ecosystem.

This implements the commercial priority Business before Product when Personal
Brand is absent. A partner has at least one active ecosystem before this policy
is evaluated; an empty entitlement set is rejected.

## Extensibility boundary

The model represents a subdomain route as `<slug>.<baseDomain>`. Current code
only recognizes the allowlisted slugs `producto` and `negocio`, plus the apex
for `PERSONAL_BRAND`. No `*.domain` DNS record, wildcard TLS behavior, arbitrary
slug, or future service is created in this ticket.

A future ecosystem must arrive through a separate ticket that adds its enum,
validated slug, entitlement semantics, target isolation, package contract and
its own deployment gate. This preserves the schema shape without making an
unregistered hostname routable.

## Backend contract

Introduce a pure route-policy helper consumed by the hostname contract and
target/provisioning callers. The helper receives only validated data:

```ts
type PartnerRouteEcosystem = "PRODUCT" | "BUSINESS" | "PERSONAL_BRAND";

type PartnerRouteResolution = {
  requestedHost: string;
  canonicalHost: string;
  action: "SERVE" | "REDIRECT";
  ecosystemType: PartnerRouteEcosystem;
};
```

It derives the canonical host from `baseDomain`, requested known host, and the
active ecosystem set. It rejects malformed base domains, duplicates, unknown
ecosystems, an empty entitlement set, and requests that are not the apex or a
current allowlisted subdomain.

`PublishingTarget` remains the production identity record. For an apex
Personal Brand target, `publicHost === baseDomain`; its `remoteRoot` is supplied
by a future root-target provisioning/preparation path, never guessed from a
display label. Product and Business keep their existing subdomain identity.

## Safety properties

- Redirect destinations are calculated from the same tenant's validated base
  domain; no URL from a request, source file, or browser query can choose the
  destination.
- The route helper is pure and has no provider, filesystem, SFTP, DNS or HTTP
  write capability.
- Existing target records are not rewritten or migrated by this ticket.
- An apex target is only valid for `PERSONAL_BRAND`; Product and Business never
  claim the apex under this policy.
- Unknown future labels fail closed rather than inheriting a wildcard route.

## Compatibility

- Existing Business target `negocio.jairopinto.pro` remains canonical and
  unchanged.
- Existing Product subdomain behavior remains canonical and unchanged.
- Legacy root targets are read only; this ticket does not silently reassign
  their public host or remote root.
- The current master hosts are out of scope. Partner routing does not alter
  master-domain paths.

## Test matrix

Focused unit tests must cover:

| Active ecosystems | Requested host | Expected action / canonical host |
| --- | --- | --- |
| Product | apex | redirect → `producto.` |
| Product | `negocio.` | redirect → `producto.` |
| Business | apex | redirect → `negocio.` |
| Business | `producto.` | redirect → `negocio.` |
| Product + Business | apex | redirect → `negocio.` |
| Product + Business | `producto.` | serve Product |
| Product + Business | `negocio.` | serve Business |
| Personal Brand + Product + Business | apex | serve Personal Brand |
| Personal Brand + Product + Business | `producto.` | serve Product |
| Personal Brand + Product + Business | `negocio.` | serve Business |
| Personal Brand + Product | `negocio.` | redirect → apex |
| Personal Brand + Business | `producto.` | redirect → apex |

Tests must also reject empty entitlements, invalid base domains, unregistered
subdomain labels, and attempts to make Product or Business own the apex.

## Delivery boundary

CDX-20260909-003 ends after the pure route contract and its callers/tests are
integrated. It does not generate the Personal Brand master, provision a root
target, create DNS records, obtain SFTP capability, publish files, or verify a
public site. Those remain separately reviewed and authorized operations.
