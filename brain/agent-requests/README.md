# Agent Request Protocol

This directory stores structured work requests and completion reports for cross-agent collaboration.

## Purpose

Use request files when a task should be executed by a specific agent, especially when the task should not be repeated after it has already been requested and reported.

## Directory Structure

- `antigravity/requests/`: frontend, UX, interaction, visual design, React, and Tailwind work requests.
- `antigravity/reports/`: completion reports written after Antigravity finishes a request.

## Operating Rule

Every request must have a stable ID and every completed request must have a matching report.

Every request must also comply with `brain/18_PARALLEL_WORK_AND_TASK_SLICING_POLICY.md`. Before dispatch, declare the owner, bounded scope, allowed and excluded files/modules, dependencies, parallel-safe ticket IDs, and integration notes. Broad requests must be split before execution.

Example:

- Request: `antigravity/requests/AGR-20260805-001_partners_compact_ui.md`
- Report: `antigravity/reports/AGR-20260805-001_partners_compact_ui_DONE.md`

If more work is needed after reviewing a report, create a new follow-up request with a new ID instead of re-running the same request.
