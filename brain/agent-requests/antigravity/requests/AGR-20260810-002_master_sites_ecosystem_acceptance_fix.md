# AGR-20260810-002 - Master Sites ecosystem acceptance fix

## Owner

Antigravity (Lead Product Designer and Frontend Lead).

## Dependency

- Follow-up to completed report `AGR-20260810-001`.
- Apply this fix to branch `antigravity/AGR-20260810-001-master-sites-ecosystem-contract` before creating its PR.
- Keep commit `f7d3625`; add a new correction commit instead of rewriting history.

## Single outcome

Bring the AGR-20260810-001 branch into acceptance by removing an out-of-scope artifact, correcting one visible interpolation error, and preventing every canonical master/showcase from appearing as a client replication target.

## Required corrections

1. Delete the untracked implementation artifact `scratch.js` from the branch.
2. Fix the Product form heading so it renders the actual active master ID. It must not display the literal characters `` `${MASTER_SITE_ID}` ``.
3. Import and use the existing `MASTER_SITE_IDS` map from `@/lib/ecosystem-contracts`; do not duplicate the three canonical IDs inside a switch.
4. Derive the active ID and domain from the existing canonical maps:
   - `MASTER_SITE_IDS[activeEcosystem]`
   - `MASTER_SITE_DOMAINS[activeEcosystem]`
5. In the client-site/replication list, exclude all of the following regardless of the active tab:
   - every value in `MASTER_SITE_IDS`;
   - every value in `MASTER_SITE_DOMAINS`;
   - `SHOWCASE_SITE_ID`;
   - `SHOWCASE_DOMAIN`.
6. Business and Personal Brand remain truthful preparation/editor shells. Do not add generation, publication, verification, or replication actions to them in this fix.
7. Preserve the correct Product generation payload introduced by `f7d3625`:
   - `PRODUCT`;
   - `ganomaster`;
   - `product.ganomaster.pro`.

## Allowed files/modules

- `app/web/components/master-site-management-view.tsx`
- Remove root `scratch.js`.
- Matching AGR-20260810-002 completion report.
- Update the AGR-20260810-001 report only if needed to make its changed-file list truthful.

## Excluded files/modules

- Backend, API, Prisma, templates, generated sites, deployment and environment configuration.
- Business editor implementation.
- Personal Brand editor/template redesign.
- Other modules and visual cleanup.

## Acceptance criteria

1. `scratch.js` is absent from the branch diff.
2. No JSX renders a literal `${MASTER_SITE_ID}` placeholder.
3. Canonical IDs are consumed from `MASTER_SITE_IDS`, not copied into a new switch.
4. None of the three masters or the showcase can appear in the replication-client list on any active tab.
5. Product still submits the canonical Product triplet.
6. Business and Personal Brand expose no new incomplete operational action.
7. Branch diff remains limited to the Master Sites component and the two matching reports.

## Verification

- Targeted ESLint for `master-site-management-view.tsx`.
- `npm run build` from `app/web`.
- Inspect the client list using fixtures containing all three master IDs/domains plus the showcase; all four reserved sites must be absent.
- Manual check that the heading visibly renders `ganomaster` on Product.
- `git diff --name-status origin/main...HEAD` must contain no `scratch.js`.

## Required report

- `brain/agent-requests/antigravity/reports/AGR-20260810-002_master_sites_ecosystem_acceptance_fix_DONE.md`
