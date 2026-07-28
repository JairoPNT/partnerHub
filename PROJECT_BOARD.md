# Project Board

## EPIC-000 Foundation

Purpose: establish the documentation, architecture memory, and governance needed before product implementation begins.

### PH-000 Project Documentation

Status: Completed

Description: create the permanent documentation structure for PartnerHub, including project memory, agent roles, roadmap references, backlog, and architecture records.

### PH-001 Repository Review

Status: Completed

Description: complete the documentation consistency review and confirm the repository structure, package layout, and tooling baseline.

### PH-002A Architecture Inventory

Status: Completed

Description: inventory the current decisions, documented assumptions, and open technical gaps before formal architecture validation.

### PH-002B Create Local Brain

Status: Completed

Description: create the repository-level local brain so every AI collaborator has a shared operational memory before working in the repo.

### PH-002C Model Usage Policy

Status: Completed

Description: define cost-aware AI model routing so routine work, daily review, and high-risk decisions use the right model tier.

### PH-002 Architecture Validation

Status: Approved with mandatory adjustments

Description: validate the first-pass architecture against multi-tenant SaaS requirements, scalability, and maintainability goals after the architecture inventory is complete.

### PH-003A Business Flows Foundation

Status: In Progress

Description: document the operational manual for PartnerHub before database planning or feature implementation begins.

### PH-003 Database Planning

Status: TODO

Description: define the initial data model, tenancy boundaries, audit strategy, and migration workflow.

### PH-004 Authentication Strategy

Status: TODO

Description: choose the identity model, session strategy, role-based access control approach, and security baseline.

### PH-005 Partner Module

Status: TODO

Description: design the first business module for partner lifecycle management, hierarchy, and operational workflows.

### PH-005A Product Page Static Generator

Status: Completed

Description: generate a validated, static product-page package from entrepreneur JSON configuration without database persistence, UI, hosting credentials, or automated deployment.

### PH-005B Internal Product Page Generation Service

Status: Completed

Description: generate persistent product-page packages from the administration service without automatic external publication.

### PH-005C Product Page Generator Interface

Status: In Progress

Description: provide the internal landing-builder form for creating validated product-page packages through the existing generation route.

### PH-005D Controlled SFTP Product Page Publication

Status: In Progress

Description: publish a generated product page to the verified Hostinger document root through SFTP credentials stored only in EasyPanel. The first release supports one fixed destination and an explicit protected backend action.

### PH-005E Dependency Security Patch

Status: In Progress

Description: patch Next and NextAuth to remove the critical and moderate advisories, verify the build, and review remaining transitive advisories without forcing a breaking downgrade.

## EPIC-100 PHOS Sync Engine

Purpose: automatically synchronize selected brain files with Notion so executive state stays current without manual copy-paste.

### PH-100A Design SYNC_MANIFEST Protocol

Status: TODO

Description: define the manifest rules that mark which brain files sync to Notion and how each file should be merged.

### PH-100B n8n Change Detection Workflow

Status: TODO

Description: create the n8n workflow that detects brain file changes and starts the sync pipeline.

### PH-100C Markdown Parser

Status: TODO

Description: convert selected brain markdown files into structured objects that can be mapped to Notion updates.

### PH-100D Notion Sync Targets

Status: TODO

Description: sync Project Progress, Progress Dashboard, Architecture Decisions, and Sprint state to the correct Notion destinations.

### PH-100E Sync Audit Logs

Status: TODO

Description: record sync date, files changed, status, and errors so the sync queue remains observable.
