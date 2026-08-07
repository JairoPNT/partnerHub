# PH-035 - Master Publication Paths

Status: Implemented in backend routing
Date: 2026-08-06
Owner: Codex

## Objective

Route each master ecosystem to its own public subdomain and Hostinger directory while keeping client sites on their own domains.

## Canonical Mapping

| Ecosystem | Master siteId | Public host | Hostinger path |
| --- | --- | --- | --- |
| Product | `ganomaster` | `product.ganomaster.pro` | `/home/u658137804/domains/ganomaster.pro/public_html/product` |
| Business / VSL | `ganomaster-business` | `business.ganomaster.pro` | `/home/u658137804/domains/ganomaster.pro/public_html/business` |
| Personal Brand | `ganomaster-personal-brand` | `brand.ganomaster.pro` | `/home/u658137804/domains/ganomaster.pro/public_html/brand` |

## Backend Rules

- Master sites are resolved by `ecosystemService`.
- Master publication ignores `HOSTINGER_SFTP_REMOTE_ROOTS_JSON`.
- Master publication uses `HOSTINGER_MASTER_REMOTE_ROOT` or `/home/u658137804/domains/ganomaster.pro/public_html`.
- Client sites still use `{domain}` template or explicit JSON mappings.
- Verification and preview URLs use the canonical subdomains.

## Operational Requirements

- Hostinger must have matching subdomains/document roots or rewrites for `product`, `business`, and `brand`.
- Cloudflare DNS must point those hosts to Hostinger.
- Do not add `ganomaster`, `ganomaster-business`, or `ganomaster-personal-brand` to client replication targets.

## Verification

Run build and publish each master preview from `/master-site`.
