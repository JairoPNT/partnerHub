# Architecture

## Goal

Build a scalable SaaS scaffold for PartnerHub without shipping full business features yet.

## Layers

- `app/` routes and pages
- `components/` UI composition
- `modules/` module registry and metadata
- `lib/` shared utilities and product constants
- `server/` database, auth and environment helpers
- `prisma/` schema draft
- `docs/` technical notes and decisions
- `scripts/` maintenance and seed helpers

## Delivery principle

Each module should start as a visible page with clear intent, then evolve into real workflows only after the scaffold is stable.

