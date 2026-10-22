# CDX004 Runtime image dependency security Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox syntax. Execution scope and method already approved by Jairo; this is the bounded realization, not a new product decision.

**Goal:** Remove the identified vulnerable image-decoder dependencies from both application and Next resolution, preserving the approved cutover and template contracts.
**Architecture:** Keep Next16/Node20 standalone packaging and the existing010/011 migration protocol. Reuse reviewed002 staging as a declared dependency; never deploy an intermediate uncorrected242 image. Rebuild the actual committed image and verify its physical dependencies, strict inventory and real CLI.
**Tech Stack:** Node20, Next16, npm lockfiles, Sharp, actual Alpine/Linux Docker image.
**Spec:** `brain/agent-requests/codex/requests/CDX-20261022-004_runtime_image_dependency_security.md` (authorized22oct).

## Global Constraints

- No DNS, campaigns, credentials, UI/copy/assets/pins235, auth, Prisma or billing changes.
- No npm audit fix --force, mass upgrades, new guards/publishers or inventory relaxation.
- Check both direct Sharp and Next-resolved Sharp and their native libraries, not just root metadata.
- Candidate floors Next16.4.1 and Sharp0.35.5 must be verified against current official registry/advisories and compatibility; choose the smallest compatible corrected set.
- Nodemailer major7→10 is excluded. A separate read-only applicability check may inform a later decision; no mail implementation here.
- One source writer; PowerShell locally, sh in Linux. Preserve previous scratch/resources and dirty root checkout.
- No production BEGIN or publication until actual paired releases and operational gates are established. Existing window/method approvals stand; no implied security waiver.

## Review Focus

- A top-level update leaves Next's actual nested decoder affected: test runtime resolution in the shipped image.
- A lock regenerates unrelated packages or peer majors: compare exact lock delta and official engine/peer constraints.
- New Next standalone layout invalidates strict inventory: build unmodified Dockerfile from binary-audited committed source and require non-null predecessor profile.
- Native decoders fail under Node20/musl: exercise benign image input/output and inspect loaded native versions.
- Dependency changes accidentally alter template or migration state: compare protected raw blobs and run shipped CLI against genuine artificial lineage, including cancel before START; no production fixture.

### Task1: Correct the decoder dependency chain

Files: app/web/package.json, app/web/package-lock.json; focused runtime dependency regression under app/web/scripts. Only necessary dependency/packaging compatibility files if a concrete failure identifies them. No template or runtime authority change.
Interfaces: consumes reviewed002 fixed staging; produces pinned compatible lock and a frozen commit usable by Task2.
- [ ] Verify official metadata, affected ranges and engines/peer constraints, including Next's sharp range. Record exact sources.
- [ ] Establish RED from safely inspecting current actual dependency resolution/native metadata against corrected floors; no exploit uploads. Add meaningful narrow regression for this boundary (not source-text grep).
- [ ] Apply smallest compatible dependency/lock correction, no unrelated upgrades; run install/benign decoder/resolution GREEN.
- [ ] Run covering tests, lint and Next build on Node20; report every failure/skip and exact command. Commit only authorized source paths; self-review and report.
- [ ] Independent task review: spec compliance and quality, including lock delta and remaining runtime dependency uncertainty.

### Task2: Verify the exact rebuilt predecessor artifact

Files: evidence/scripts only under this plan's ignored scratch; no source changes. Consumes Task1 frozen commit. If a source defect appears, return to Task1 owner/review rather than overlaying image contents.
- [ ] Build actual unmodified Dockerfile from official commit archive or binary-safe Git context, preserving source modes and auditing every raw byte against Git; report immutable image digests and Node20/Linux identity.
- [ ] Inspect both actual resolved Sharp copies/native versions and query fresh official advisories with names+versions only. Exercise benign decode/output offline; no credentials/provider.
- [ ] Require unchanged strict non-null inventory and profile; verify no link/write-permission weakening. Reuse actual CLI artificial lineage rehearsal and real before/after byte/physical checks; no fake authority.
- [ ] Record outcome and independent review of new evidence. Preserve resources for dependent SUCCESSOR003.

## Integration

Root coordinates one reviewed PR004 containing reviewed002 dependency plus004. Do not merge242 first: auto-deploy would send the uncorrected image. A final whole-branch review checks combined boundaries and remaining advisories. Promote/merge only after gates pass; then compose235 in separate003 with actual paired artifact validation. Independent bounded mail-input read-only analysis may run during Task1 and writes only its assigned scratch report, never source.
