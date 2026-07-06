# CTO Playbook

This folder is the local operating memory for PartnerHub.

## Source Of Truth

- Notion is the executive dashboard.
- This repository is the operational memory.
- GitHub is the technical source of truth.
- `brain/` is the first thing every AI agent must read before doing any work.

## Current Mission

- Current project: PartnerHub
- Current sprint: Sprint 0 - Foundation
- Active ticket: PH-002B - Create Local Brain
- Pending ticket: PH-002A - Architecture Inventory
- Architecture validation stays pending until the inventory is complete.

## Non-Negotiable Rules

- Do not build new features until Architecture Validation is complete.
- Keep the platform generic.
- Do not hardcode Gano Excel into architecture.
- Do not change files outside the assigned ticket scope.
- Document decisions instead of relying on chat memory.

## Delivery Standard

Every completed ticket must return:

- Summary
- Files changed
- Risks
- Next recommended ticket

## Decision Order

1. ChatGPT defines architecture, tickets, priorities, and approval.
2. Codex executes backend and documentation work within scope.
3. Antigravity executes frontend and product design work within scope.
4. Claude Code reviews quality, safety, and maintainability.
5. Jairo approves product direction as CEO / Product Owner.

