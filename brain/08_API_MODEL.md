# API Model

## API Direction

The API should stay versioned, predictable, and easy to reason about.

## API Principles

- Prefer stable contracts over rapid endpoint sprawl.
- Model business capability explicitly.
- Keep tenant boundaries visible in the API shape.
- Make authorization checks deterministic.
- Preserve auditability for sensitive actions.

## Expected Surface Areas

- authentication
- tenancy and organization management
- entrepreneur lifecycle
- web asset packages
- master assets and validated messages
- personalized channels
- external lead destinations
- traffic generation
- reporting
- automation
- audit and admin

## Technical Expectations

- Backend ownership belongs to Codex.
- Database and auth decisions must align with architecture tickets.
- API changes should not be made before the architecture gate is complete.
- The SaaS should own orchestration, publishing control, and cost tracking.
- The API should expose generation, publication, and artifact management flows without assuming that every render happens inside the VPS.
- The API must not expose CRM-style lead management, inbox, pipeline, opportunity, deal, follow-up, or post-routing commercial management surfaces.
- Redirect or click tracking should be modeled as terminal BusinessEvent traceability, not lead ownership.

## Open Questions

- REST, RPC, or hybrid contract style?
- Where should versioning live?
- Which endpoints need strict idempotency?
- How should tenant scoping be enforced consistently?
- What parts of publishing should be asynchronous versus immediate?
- Which cost events must be stored for operational reporting?
- Which events are required to measure routing effectiveness without storing managed leads?
