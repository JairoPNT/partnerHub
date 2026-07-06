# Session Protocol

## Permanent Rule

No long conversation should close without creating a `SESSION_HANDOFF_YYYY-MM-DD.md` file.

## Required Handoff Sections

Every handoff must include:

- Executive summary
- Decisions made
- Tickets completed
- Tickets open
- Risks
- Next mission
- Pending prompts
- Architecture changes
- Current project state

## Session Start Rule

At the start of a new session, read the latest handoff first, then the live project state, then the project context, then the next mission, then the decisions file.

## Closeout Rule

If a session touches architecture, roadmap, documentation memory, or queue management, it should end with a handoff file before the conversation is considered complete.

## Continuity Rule

The handoff file is the bridge between sessions, so it must be written in a way that a new agent can continue without chat history.

