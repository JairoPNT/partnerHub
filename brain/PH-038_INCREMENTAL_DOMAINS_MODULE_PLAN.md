# PH-038 - Incremental Domains module plan

Status: Planned
Date: 2026-08-07

## Objective

Connect the existing Domains menu without combining backend inventory, live diagnostics, frontend presentation, and registrar guidance into one mega-task.

## Ordered tickets

### PH-038A - Domain inventory read model API (completed)

Owner: Codex

- Aggregate canonical master domains, legacy partner domains, and explicit PublishingTargets.
- Keep assignment, provisioning, DNS, SSL, publication, and verification as distinct fields.
- Protect the route with PH-036G Cloudflare Access validation.
- Do not perform live DNS queries.

### PH-038B - Restricted DNS diagnostic API

Owner: Codex
Dependency: PH-038A

- Resolve only hostnames already present in the inventory.
- Add strict validation, timeout, bounded concurrency, and short cache.
- Never accept an arbitrary internet hostname.

### AGR-20260807-002 - Domains inventory UI (ready for Antigravity)

Owner: Antigravity
Dependency: PH-038A stable contract

- Read-only cards, partner inventory, search, filters, and truthful state labels.
- No backend files and no infrastructure secrets.

### AGR follow-up - DNS diagnostic interaction

Owner: Antigravity
Dependency: PH-038B stable contract and completed inventory UI report

- One explicit diagnostic action and bounded result states.
- Registrar guidance remains a later request if still required.
