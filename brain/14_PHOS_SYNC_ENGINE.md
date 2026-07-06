# PHOS Sync Engine

## Goal

Automatically synchronize selected `brain/` files with Notion so Notion stays updated without manual copy-paste.

## Epic

`EPIC-100 - PHOS Sync Engine`

## Proposed Tickets

- `PH-100A - Design SYNC_MANIFEST protocol`
- `PH-100B - Create n8n workflow to detect changes in brain/`
- `PH-100C - Build Markdown-to-structured-object parser`
- `PH-100D - Sync Project Progress, Progress Dashboard, Architecture Decisions and Sprints to Notion`
- `PH-100E - Add sync audit logs with date, files changed, status and errors`

## Sync Architecture

```text
brain/
-> Git commit / push
-> GitHub webhook
-> n8n
-> Read changed brain files
-> Parse markdown / manifest
-> Update Notion
-> Write sync log
```

## Architecture Notes

- The sync engine should only touch files that explicitly opt in.
- Notion should receive executive-facing content, not every internal note.
- The repo remains the operational memory and GitHub remains the technical source of truth.
- n8n is the orchestration layer, not the source of truth.

## Future SYNC_MANIFEST Idea

Each syncable brain file can declare intent with YAML front matter.

```yaml
sync:
  notion: true
  destination: Project Progress
  strategy: merge
```

Or opt out entirely:

```yaml
sync:
  notion: false
```

This avoids pushing every internal note to Notion.

## Files Most Likely To Sync

- `brain/LIVE_PROJECT_STATE.md`
- `brain/PROJECT_CONTEXT.md`
- `brain/04_DECISIONS.md`
- `brain/03_NEXT_MISSION.md`
- `brain/02_CURRENT_STATUS.md`
- `brain/01_CURRENT_SPRINT.md`

## Files Likely To Remain Local

- `brain/09_AI_MEMORY.md`
- `brain/10_PROMPT_LIBRARY.md`
- `brain/11_MODEL_USAGE_POLICY.md`
- `brain/14_PHOS_SYNC_ENGINE.md`
- `brain/15_SESSION_PROTOCOL.md`

## Open Questions

- Which Notion pages are the canonical destinations for each synced file?
- Should progress sync use merge or full replace by default?
- Which file changes should trigger immediate sync versus queued sync?
- Should sync failures alert only the repo log, or also the operational dashboard?
