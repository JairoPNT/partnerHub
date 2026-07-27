# AI Memory

## Current Team Roles

- ChatGPT = CTO / Chief Software Architect
- Codex = Backend Lead Engineer
- Antigravity = Lead Product Designer / Frontend Engineer
- Claude Code = Principal Reviewer / QA Engineer
- Jairo = CEO / Product Owner

## Collaboration Rules

- Every ticket has one primary owner.
- No AI should silently override another AI's domain.
- Architecture decisions must be recorded.
- Review feedback must be specific and actionable.

## Current Working Memory

- PartnerHub is generic first and tenant-specific later.
- Gano Excel is the first implementation, not the architectural identity of the product.
- Notion is the executive dashboard.
- `brain/` is the local working memory.
- GitHub is the technical source of truth.
- VPS hosts the control plane; external hosting serves generated public artifacts.
- External API usage and hosting spend must be tracked explicitly.
- Sprint 0 is practically complete.
- PH-002 is approved with mandatory adjustments.
- PH-003A is the next real product ticket.
- EPIC-100 is the future PHOS Sync Engine queue.
- n8n is the automation orchestrator.
- HeyGen and ElevenLabs remain future integrations under EPIC-800 AI Content Studio.

## Reminders For Future Agents

- Read `brain/` before taking action.
- Stay inside ticket scope.
- Preserve the generic SaaS model.
- Do not build features before Architecture Validation is complete.
- Do not assume rendering always happens inside the SaaS.
- Never close a long session without a dated session handoff file.

## Completed Work Log

- PH-007 (Claude Code): created the UX/QA evaluation framework for future screens. Deliverables: `docs/design/UX_AUDIT_FRAMEWORK.md` (10 evaluation dimensions: accessibility, consistency, responsive behavior, information hierarchy, SaaS usability, empty states, loading states, error states, scalability, maintainability) and `docs/development/QA_CHECKLIST.md` (the same dimensions as an operational per-PR checklist). No code, features, backend, database, or package changes were made â€” documentation only, per ticket scope. Use these two documents whenever reviewing a screen or PR from Antigravity going forward.

