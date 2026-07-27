# Business Flow Review

Ticket: PH-012
Owner: Claude Code (Principal Reviewer)
Reviewed against: `brain/` (all files) and `docs/product/` (`01_BUSINESS_FLOWS.md`, `user-flow-requirements.md`, `README.md`)

## Purpose

This is a review of the 10 business flows currently documented in [01_BUSINESS_FLOWS.md](01_BUSINESS_FLOWS.md), evaluated for missing steps, business risk, automation opportunity, redundancy, and UX friction, plus the questions that should be answered before any of these flows moves into implementation. This document does not redesign the flows, does not implement anything, and does not touch backend code — findings are for the Chief Software Architect (ChatGPT) and Product Owner (Jairo) to act on, per `brain/AGENT_RULES.md`.

## Cross-Cutting Findings

These apply across multiple flows rather than one specific flow, and are the highest-leverage findings in this review.

### 1. Tenant context is never explicitly validated at any entry point

`brain/06_DOMAIN_MODEL.md` states as a domain rule: "a tenant must never see another tenant's data." Every one of the 10 flows lists "tenant context" only as an implicit input (Flow 1) or doesn't mention it at all (Flows 2–10). None of the flows describes *how* tenant context is captured, validated, or enforced at the entry point. Given this is a non-negotiable domain rule, it should be a first-class, explicit step in every flow that creates or modifies data, not an assumed side effect.

### 2. Approval/review gates are inconsistent across public-facing content flows

Flow 4 (Master Site Update) explicitly gates on "Approved change" as its trigger. Flow 3 (Landing Creation), Flow 6 (VSL Creation), and Flow 7 (Campaign Creation) — all of which produce public-facing, revenue-affecting content — have no equivalent approval gate. This is an inconsistent pattern, not a one-off gap, and it matters more than usual here because the first tenant (Gano Excel) operates in a regulated space (see Business Risks below).

### 3. Master Site Update and Product Update Propagation look like the same flow twice

Flow 4 and Flow 5 both describe: approved change → propagate → diff-based/selective update → audit trail → rollback snapshot → notification. As written, these read like two parallel implementations of the same propagation engine rather than genuinely distinct flows. Worth confirming with the architect whether Product Update Propagation is a specialization of Master Site Update (product changes are one category of "master content") before two separate propagation systems get built.

### 4. Repeated cross-cutting concerns suggest missing shared services

"Cost logging" appears as an automation opportunity in 8 of the 10 flows (1, 3, 4, 5, 6, 7, 8, 9, 10). "Notification"/"notification queue" appears in 5 of them (1, 2, 4, 8, 10). As documented, each flow implies its own local logging/notification step. Recommend these be modeled as shared platform services that flows call into, not reimplemented per flow — otherwise cost tracking (a stated product requirement in `brain/05_PRODUCT_MODEL.md`) will drift in accuracy across modules.

### 5. Two RF-level flows from the requirements doc are missing entirely

`docs/01_requerimientos.md` (RF-02, RF-03) requires the system to support suspending partners and assigning commercial plans. Neither **Partner Suspension/Offboarding** nor **Plan Assignment/Upgrade** exists as one of the 10 documented flows. Given the commercial model in the original maestro doc explicitly includes a paid "upgrade" path between plan tiers, this isn't a minor omission — it's a required flow that hasn't been authored yet.

### 6. No flow covers payment failure, refund, or subscription lapse

Flow 1 creates a "payment tracking entry" and Flow 10 tracks recurring renewal, but nothing describes what happens on a refund, chargeback, failed renewal payment, or retry/dunning sequence. Since the business model (per the original maestro doc) is implementation fee + recurring monthly management fee + upgrades, the failure path of that recurring fee is central to the business model, not an edge case.

### 7. The generic user-flow diagram and the 10 business flows aren't reconciled

`user-flow-requirements.md` shows the Partner path as a short linear sequence (onboarding → hierarchy → commissions → content → notifications → sign out). The 10 business flows show partners (or admins acting for them) doing much richer work — creating landings, VSLs, campaigns, configuring WhatsApp, connecting domains. Where these creation flows attach to the partner's actual navigation isn't shown in either document. These two documents should agree with each other before UI work starts.

## Per-Flow Findings

### Flow 1 — New Partner Purchase

- **Missing steps:** sponsor/referral validation (is the referenced sponsor active, and in the same tenant?); duplicate/idempotent-event handling for repeated checkout webhooks; a defined path for manual purchase entries (who approves them, is there a fraud check); no refund/reversal handling once a partner has already been onboarded off this purchase.
- **Business risks:** the "Business Rules" section is empty, meaning commission/referral crediting has no defined logic yet; without idempotency handling, a duplicated webhook could double-onboard or double-credit a partner.
- **UX friction:** no defined feedback path to the buyer/partner if payment fails or a manual entry is rejected.
- **Questions:** What is the idempotency key for a checkout event? What validates that a referenced sponsor is eligible to receive credit?

### Flow 2 — Partner Onboarding

- **Missing steps:** identity/duplicate-partner detection (same person already a partner elsewhere, possibly under another tenant or sponsor); credential issuance (invite link, password setup, SSO) isn't described despite being required for RF-01 authentication; no timeout/expiration handling for onboarding that's started but never finished.
- **Business risks:** this flow assumes hierarchy assignment happens via "commercial assignment data," but `brain/06_DOMAIN_MODEL.md` lists "should partner hierarchy be modeled as adjacency, path, or hybrid" as an open, unresolved question — this flow is implicitly depending on an architecture decision that hasn't been made yet.
- **UX friction:** "pending setup tasks" doesn't specify whether the partner or an admin is responsible for clearing them, and there's no visible progress indicator described.
- **Questions:** What happens to a partner stuck in incomplete onboarding after N days? Is there a dedup check across tenants, or is a person allowed to be a partner in more than one tenant?

### Flow 3 — Landing Creation

- **Missing steps:** no approval/compliance gate before publish (inconsistent with Flow 4); no domain-uniqueness check; no explicit handling for the "duplicate an existing template" path vs. "create from scratch."
- **Business risks:** direct-selling/MLM landing pages are commonly subject to regulatory scrutiny (income claims, product health claims — relevant given the first tenant, Gano Excel, sells wellness products). There is no compliance/legal review step anywhere in this flow.
- **Redundant/unclear overlap:** this flow lists "domain or subdomain target" as an input, but domain connection is also a fully separate flow (Flow 9). It's not specified whether Flow 3 always triggers Flow 9, or whether a landing can be created and left unpublished indefinitely with no connected domain.
- **Questions:** Is there a mandatory compliance review before a landing publishes? What happens to a Landing Creation output if no domain is ever connected?

### Flow 4 — Master Site Update

- **Missing steps:** no preview/diff step before propagation; no conflict-resolution rule for downstream sites that have local, partner-level customizations — does a master update silently overwrite them?
- **Business risks:** this is the highest blast-radius flow in the set — a bad master update propagates to every downstream site at once, with no staged/canary rollout described, only a post-hoc "rollback snapshot" as an automation opportunity rather than a guaranteed precondition.
- **Questions:** What is the override precedence between master content and partner-level customization? Is propagation staged/canaried or always full-fanout?

### Flow 5 — Product Update Propagation

- **Missing steps:** no registry described that maps a product to the specific pages/artifacts referencing it — without that, the listed automation opportunity "selective republishing" isn't actually achievable.
- **Redundancy:** see cross-cutting finding #3 — this flow substantially duplicates Flow 4's shape.

### Flow 6 — VSL Creation

- **Missing steps:** no mandatory review/approval gate before external publish, despite `brain/05_PRODUCT_MODEL.md` explicitly requiring "consent controls" and "review before publication" for AI-generated content (EPIC-800 scope) — this flow already uses HeyGen/ElevenLabs as actors, meaning it's effectively already in that scope, but the required consent/review gate is only an optional "review queue" automation idea, not a required step.
- **Business risks:** this flow generates the "business opportunity" video content, which is the most regulation-sensitive artifact in the whole product (income claims, testimonials). Publishing without a mandatory human/legal review step is a real compliance exposure. Separately, there's no pre-generation cost/budget check against tenant plan limits — only post-hoc "cost logging" — creating a runaway-spend risk on paid generation APIs.
- **Questions:** Is human review mandatory before a VSL publishes, or optional? Is there a per-tenant generation budget enforced before calling HeyGen/ElevenLabs, or only after?

### Flow 7 — Campaign Creation

- **Missing steps:** budget enforcement — "budget references" is an input, but no rule describes what happens when spend approaches or exceeds it.
- **Business risks:** this flow links to Landing and VSL artifacts; if those upstream flows can produce unreviewed or non-compliant content (see Flows 3 and 6 above), campaigns can distribute that content at paid-media scale before anyone reviews it — compounding the compliance risk rather than containing it.
- **Questions:** Is there a hard stop when campaign spend hits budget, or only a notification?

### Flow 8 — WhatsApp Configuration

- **Missing steps:** WhatsApp Business API requires Meta-side template approval for outbound messaging — this isn't reflected in the "template references" input; no explicit failure/verification output is described (contrast Flow 9, which has an explicit "verification state" output — Flow 8 only lists "connected messaging channel," implying success-only).
- **Questions:** How are Meta template approvals tracked, and what happens to campaigns/flows depending on a template that gets rejected?

### Flow 9 — Domain Connection

- **Missing steps:** no domain-ownership verification step before connecting (risk of connecting a domain the tenant doesn't control); no explicit handoff to Flow 10 for renewal tracking, even though Flow 10 lists "domain renewals" as an input.
- This is the most complete flow in the set relative to the others (it already includes verification state and SSL checks) — worth using as the template quality bar for filling in the other flows' Business Rules and Open Questions sections.

### Flow 10 — Monthly Renewal

- **Missing steps:** no grace-period/suspension logic for a lapsed or failed renewal; no dunning/retry sequence for failed payments; no distinction between a tenant-level subscription lapsing vs. an individual partner's monthly management fee lapsing — these are two different renewal scopes with likely different consequences, and the flow treats them as one.
- **Business risks:** since the recurring monthly fee is the core of the business model (per the original maestro doc), the absence of any failure-path definition here is a direct revenue-and-retention risk, not just a technical gap.
- **Questions:** What is the grace period before suspension on a failed renewal? Does a lapsed tenant-level subscription cascade to suspend every partner underneath it, or just billing status?

## Recommendations

1. Resolve the partner-hierarchy modeling question (`brain/06_DOMAIN_MODEL.md`) before finalizing Flow 2 — onboarding already assumes an answer that hasn't been decided.
2. Standardize an approval/compliance gate across all public-facing content flows (Landing, VSL, Campaign), matching the pattern already used in Master Site Update, given the regulatory exposure of the MLM/direct-selling space.
3. Confirm with the architect whether Master Site Update and Product Update Propagation should be unified into one propagation flow with product changes as a sub-case, rather than two parallel engines.
4. Author the two missing flows implied by the existing requirements doc: Partner Suspension/Offboarding (RF-02) and Plan Assignment/Upgrade (RF-03).
5. Add a payment-failure/renewal-lapse flow (or extend Flow 10) covering grace period, dunning, and suspension cascade — this is core business-model risk, not polish.
6. Model cost logging and notifications as shared cross-cutting services in the architecture rather than a per-flow responsibility, given how often both repeat across the existing 10 flows.
7. Reconcile `user-flow-requirements.md`'s navigation diagram with the richer creation flows (Landing, VSL, Campaign, WhatsApp, Domain) so the UI navigation model and the business-flow model agree before frontend work starts.

## Risks

- **Compliance risk (highest severity):** no flow currently enforces legal/compliance review for income- or health-claim-bearing content (Landing, VSL, Campaign), while the first tenant operates in a regulated wellness/MLM space.
- **Data-integrity risk:** tenant-context validation isn't explicit in any flow, despite being a stated non-negotiable domain rule.
- **Blast-radius risk:** Master Site Update can propagate to all downstream sites with no staged rollout and an undefined override-precedence rule against partner-level customizations.
- **Revenue risk:** no defined behavior for failed/lapsed recurring payments, which is the core of the subscription business model.
- **Engineering-debt risk:** Master Site Update and Product Update Propagation risk being built as two duplicate systems if not clarified before implementation.
- **Scope risk:** two requirements-driven flows (Suspension/Offboarding, Plan Assignment/Upgrade) are missing from the documented set and could be discovered late if not authored before implementation planning proceeds.

## Summary

The 10 documented business flows are consistent in shape and cover the platform's core commercial and content-operations loop, but every flow's Business Rules and Open Questions sections are still empty — meaning what's captured so far is the happy path, not the edge cases or exception handling. The most significant gaps are cross-cutting: tenant-context validation is never explicit, approval/compliance gates are applied inconsistently to regulation-sensitive content, Master Site Update and Product Update Propagation appear to duplicate each other, and two flows required by the existing requirements doc (Suspension, Plan Assignment/Upgrade) haven't been authored yet. None of these are implementation blockers by themselves, but several (compliance review gates, tenant-context enforcement, renewal-failure handling) should be resolved before Architecture Validation proceeds, since they affect data modeling and API shape decisions that are hard to retrofit later.
