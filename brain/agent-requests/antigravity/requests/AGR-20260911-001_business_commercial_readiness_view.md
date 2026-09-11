# AGR-20260911-001 — Business commercial readiness in Partners

## Owner

Antigravity (Lead Product Designer and Frontend Lead; balanced model tier).

## Scope boundary

- Single outcome: make an operator-visible, read-only Business readiness panel available from the existing Partner details experience.
- Allowed files/modules: existing Partners/activation-lead React components and their frontend tests only, plus this request and its completion report.
- Excluded files/modules: `app/web/server/**`, `app/web/app/api/**`, Prisma, auth, Docker, templates, master-package artifacts, publication worker/enqueue services, provider/DNS/SFTP configuration, credentials, and deployment configuration.
- Dependencies: CDX-20260911-002 must be merged and deployed first.
- Parallel-safe with: backend work that does not change the endpoint contract below.
- Integration notes: this request consumes the backend contract only. It must not infer readiness locally or submit a publication action.

## Backend contract

For the selected partner activation lead, request:

`GET /api/internal/activation-leads/{activationLeadId}/business-commercial-readiness`

The endpoint requires the normal PartnerHub Cloudflare Access session and returns no-store JSON. Successful non-blocked responses include:

```ts
{
  status:
    | "READY_FOR_PUBLICATION_PREVIEW"
    | "PUBLICATION_CURRENT"
    | "PUBLICATION_SCHEDULED"
    | "RETRY_REQUIRED";
  blocked: false;
  blockedReasons: [];
  siteId: string;
  publicHost: string;
  artifacts: {
    sourceHash: string;
    targetHash: string;
    masterPackageHash: string;
    intentHash: string;
  };
}
```

A safe blocker is:

```ts
{
  status: "BLOCKED";
  blocked: true;
  blockedReasons: Array<
    | "ACTIVATION_NOT_APPROVED"
    | "ENTITLEMENT_NOT_FOUND"
    | "BUSINESS_NOT_ENTITLED"
    | "TARGET_NOT_FOUND"
    | "TARGET_OWNERSHIP_MISMATCH"
    | "TARGET_NOT_READY"
    | "ARTIFACT_MISSING"
    | "ARTIFACT_INVALID"
    | "MASTER_PACKAGE_MISSING"
    | "INVENTORY_UNAVAILABLE"
  >;
  artifacts: null;
}
```

The endpoint returns `404 { error: "ACTIVATION_LEAD_NOT_FOUND" }` for an absent lead and `401` if the user is outside the official Cloudflare Access host/session.

## Required behavior

- Show a compact Business readiness state only when the operator opens/selects an existing partner; do not bulk-poll every partner by default.
- Translate each bounded status/reason into human Spanish that says what is ready or what is missing without exposing hashes by default.
- `READY_FOR_PUBLICATION_PREVIEW` is informative only: label it as ready to review. Do not add an upload, enqueue, publish, retry, DNS, or SFTP action in this request.
- `PUBLICATION_CURRENT`, `PUBLICATION_SCHEDULED`, and `RETRY_REQUIRED` must be visually distinguishable and explain that publication control arrives in a separate approved ticket.
- Preserve the existing courtesy-grant readback behavior and normal Partner error states. A `401` must say the official Cloudflare Access URL/session is required, not that the partner lacks a courtesy grant.
- Keep mobile layout concise and accessible; do not show internal hash values unless the existing UI already has an intentional advanced diagnostic disclosure.

## Verification

- Targeted ESLint for every changed frontend file.
- `npm run build` from `app/web`.
- Manual validation on one active Business partner and one partner without Business entitlement.
- Confirm the browser makes no publication-mutating request from the readiness panel.

## Required report

- Report: `brain/agent-requests/antigravity/reports/AGR-20260911-001_business_commercial_readiness_view_DONE.md`.
- Suggested branch: `antigravity/AGR-20260911-001-business-commercial-readiness-view`.
- PR target: `main`.
