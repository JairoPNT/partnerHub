# Master Sites Business verification and release implementation plan
> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development for the two bounded verification repairs, with task reviews and final delta review.
**Goal:** resolve the ten recorded verification scripts, integrate reviewed dashboard and verify EasyPanel deployment without customer generation.
**Architecture:** no new publisher or backend behavior. Repair environment/test fixtures against existing contracts, then integrate accepted commits on the dashboard integration branch.
**Tech Stack:** PowerShell, Node24 test host/actual Node20 packaging child, Next16, git/gh; sh for existing VPS console only.
**Spec:** approved docs/superpowers/specs/2026-10-20-business-master-sites-manual-delivery-design.md plus Jairo's 2026-10-23 explicit directive to resolve verification/integrate/deploy and exclude Claudia.
## Global Constraints
- No Claudia regeneration/publication/asset/measurement changes; no other customer publication as smoke.
- No DNS, SFTP, template/master/pins, campaigns, account settings, Prisma, auth/contract changes.
- No suppression/skips of required checks; exact reviewed artifact bytes and real Node20 are binding.
- Root dirty checkout preserved; existing dashboard source already reviewed, do not rebuild it.
- Separate branches/worktrees for independent repairs; no simultaneous edits to shared files/output.
## Review Focus
- Outdated fixture repaired without relaxing current owner/ecosystem/host validation.
- Refresh exclusion still prevents generation/provider effects; changing error assertions must not hide writes.
- LF artifact verification must compare Git-reviewed bytes, not normalize both sides.
- Node20 child runtime must really be20 and standalone prerequisites explicit.
- Deployment may wake existing worker: perform read-only queue/barrier preflight; no customer POST, especially Claudia.
## Tasks
- [ ] Task1/CDX002: reproduce and repair four contract fixture scripts; per-task review against brief/report/diff.
- [ ] Task2/CDX003: reproduce six packaging scripts with actual Node20/built artifacts; fix only test setup as needed; per-task review. Parallel with Task1, disjoint worktrees.
- [ ] Task3/CDX004: integrate accepted commits; Node20 production build, full declared test scripts and dashboard202tests/lint; one final review of release delta with prior dashboard acceptance evidence. No repeated frontend implementation.
- [ ] Task4/CDX004: check current deployment/queue read-only, create/attach PR, merge exact reviewed main and observe EasyPanel deploy; GET-only authorization/UI check; compare Claudia public assets before/after. No publish/customer mutation. If real session absent request access, don't fabricate success.
## Acceptance
All named failure scripts resolve with disclosed runtime/prerequisites; full suite success plus explicit platform-only skip limits, production build/lint success, independent reviews close load-bearing issues. GitHub merged SHA matches observed deploy. Claudia assets/measurement unchanged. Local status/brain release report reflect exact achieved stage.

