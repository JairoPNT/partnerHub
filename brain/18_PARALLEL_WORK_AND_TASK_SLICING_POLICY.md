# Parallel Work and Task Slicing Policy

## Objective

PartnerHub must favor short, independent work streams over large sequential tasks. Work should be divided so Codex, Antigravity, reviewers, and multiple Codex chats can progress at the same time without editing the same responsibility or files.

## Mandatory Rule: No Mega Tasks

- Do not start a request that combines multiple independent deliverables.
- Split broad initiatives into the smallest independently verifiable tickets that produce useful progress.
- A task should have one primary outcome, one owner, one branch, and a bounded set of files or modules.
- Frontend, backend, infrastructure, documentation, and review should be separate tickets unless they are technically inseparable.
- A long dependency chain must be expressed as ordered tickets, not hidden inside one request.

## Parallelization Before Execution

Before starting any non-trivial task, the orchestrator must identify:

1. Which parts are independent and can run in parallel.
2. Which parts have real dependencies and must remain sequential.
3. Which agent owns each part.
4. Which files, modules, routes, database objects, or infrastructure resources each part may modify.
5. The integration order and verification required after merging.

Independent work must be delegated immediately instead of waiting for another task to finish.

## Non-Overlap Contract

Every parallel ticket must declare:

- `Owner`: Codex, Antigravity, Claude, or another approved agent.
- `Scope`: the single expected result.
- `Allowed files/modules`: where the owner may work.
- `Excluded files/modules`: shared or protected areas the owner must not modify.
- `Dependencies`: ticket IDs that must be completed first, or `None`.
- `Parallel-safe with`: ticket IDs that may run simultaneously.
- `Integration notes`: contracts that other tickets may consume without modifying.

Two active tickets must not modify the same source file, database migration, API contract, deployment configuration, generated artifact, or shared state unless one is explicitly designated as the sole integration owner.

## Multiple Codex Chats

Multiple Codex chats may work concurrently only when all of these conditions are met:

- Each chat has a different ticket ID.
- Each chat uses its own branch created from the current `origin/main`.
- Each chat uses a separate Git worktree or isolated workspace.
- Each ticket has a non-overlapping file/module declaration.
- No chat performs broad cleanup, mass formatting, dependency upgrades, schema changes, or generated-file rewrites outside its declared scope.
- Cross-cutting changes are assigned to one integration ticket after the parallel tickets finish.

If overlap is discovered, the later task must stop editing the conflicting area and create a handoff or follow-up ticket.

## Dynamic Delivery Flow

1. Slice the initiative into independent tickets.
2. Mark dependencies and parallel-safe relationships.
3. Dispatch frontend work to Antigravity and backend/infrastructure work to Codex simultaneously where possible.
4. Use separate chats for additional Codex tickets only when their modules do not overlap.
5. Merge and verify each ticket independently.
6. Run one final integration ticket only for cross-module validation and contract reconciliation.

Documentation and reports must be concise and must not delay delivery of unrelated parallel tickets.

## Task Size Guardrail

A request must be split before execution when it contains more than one of these outcomes:

- a new user-facing flow;
- a backend/API or database change;
- infrastructure or deployment work;
- a visual redesign;
- data migration or cleanup;
- cross-module integration;
- release or production verification.

Exceptions require an explicit architectural reason recorded in the ticket.

## Orchestrator Responsibility

Codex, acting as orchestrator, must prevent overlapping assignments, keep branch and ticket ownership coherent, expose available parallel work, create follow-up tickets instead of expanding active tickets without limit, and report blockers early while continuing other parallel-safe work.

## Definition of Done

A parallel ticket is complete only when its own verification passes and its report identifies changed files/modules, contracts produced or consumed, integration risks, branch and commit, and whether a separate integration ticket is required.
