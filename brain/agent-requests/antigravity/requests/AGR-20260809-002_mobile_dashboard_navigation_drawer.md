# AGR-20260809-002 - Mobile dashboard navigation drawer

## Owner

Antigravity (Lead Product Designer and Frontend Lead).

## Dependency

- Follow-up discovered during production acceptance of completed `AGR-20260809-001`.
- `AGR-20260809-001` is merged and deployed through PR #93.
- Existing routes and `moduleNavigation` are stable and must remain unchanged.

## Single outcome

Restore access to the dashboard's primary navigation whenever the desktop sidebar is hidden, using an accessible mobile/tablet navigation drawer.

## Production problem

At widths below the current `xl` sidebar breakpoint, the sidebar is hidden and the topbar exposes no navigation control. An operator can open a module such as Partners or Domains, but cannot move to another module without manipulating the URL or returning through browser history.

## Required behavior

### 1. Navigation trigger

- Add a clearly recognizable menu button at the left side of the topbar whenever the desktop sidebar is hidden.
- The trigger must remain visible below the same breakpoint used by the sidebar (`xl`).
- Hide the trigger when the persistent desktop sidebar is visible.
- Give the control an accessible name such as `Abrir menú principal` and expose open/closed state with `aria-expanded`.
- Do not remove or obscure the notification and user controls already present in the topbar.

### 2. Mobile/tablet drawer

- Open a left-side drawer or equivalent overlay containing the same navigation groups and routes as the desktop sidebar.
- Reuse `moduleNavigation`; do not create a second hardcoded route catalog.
- Preserve the active-route indication.
- Provide a visible close button with an accessible label.
- Close the drawer when:
  - the operator selects a route;
  - the operator presses `Escape`;
  - the operator activates the backdrop;
  - the viewport reaches the persistent desktop-sidebar breakpoint.
- Prevent background scrolling while the drawer is open.
- Keep the drawer vertically scrollable when its navigation is taller than the screen.

### 3. Accessibility and interaction

- Use appropriate dialog/navigation semantics and connect trigger/drawer identifiers with ARIA attributes.
- Move focus into the opened drawer and return focus to the trigger after closing when practical.
- Keyboard users must be able to reach every navigation link and the close control.
- The backdrop must be visually distinct without hiding the drawer.
- Respect reduced-motion preferences; animation is optional and must not block use.

### 4. Responsive acceptance

- At 390px, the operator can move from Partners to Domains and from Domains to Analytics without changing the URL manually.
- At 768px and 1024px, the navigation trigger remains available because the persistent sidebar is still hidden.
- At `xl` and above, only the existing persistent desktop sidebar is used; no duplicate menu trigger or overlay remains visible.
- Opening the drawer must not cause horizontal page overflow.
- The solution must work from every module rendered inside `AppShell`, not only Domains.

## Allowed files/modules

- `app/web/components/app-shell.tsx`
- `app/web/components/sidebar.tsx`
- `app/web/components/topbar.tsx`
- One optional frontend-only navigation helper/component colocated under `app/web/components/`, if needed to share navigation rendering without duplication.
- Matching completion report.

## Excluded files/modules

- All page-specific views, including `domains-inventory-view.tsx`.
- `app/web/app/api/**`
- `app/web/server/**`
- `app/web/modules/catalog.ts` unless a documented blocker proves a route-catalog defect; route additions or renames are not authorized.
- Backend, auth, Cloudflare Access, Prisma, Docker, Easypanel, dependencies, global redesign, and environment files.

## Explicitly out of scope

- No bottom navigation bar.
- No route additions, removals, or renaming.
- No notification, search, or user-profile feature work.
- No redesign of the desktop sidebar.
- No mobile redesign of individual modules.

## Parallel-safe with

- `PH-040A`, because that ticket is isolated to generated-page backend services.
- `PH-040B`, provided it remains isolated to publication verification services and tests.

## Verification

- Targeted ESLint for every changed frontend file.
- `npm run build`.
- Manual interaction verification at 390px, 768px, 1024px, and at least 1280px.
- Verify navigation between at least Partners, Domains, and Analytics.
- Verify click, backdrop, route-selection, and `Escape` closure.
- Verify no duplicate menu at desktop width and no horizontal overflow.
- Verify accessible labels and keyboard reachability.

## Report and branch

- Required report: `brain/agent-requests/antigravity/reports/AGR-20260809-002_mobile_dashboard_navigation_drawer_DONE.md`.
- Suggested branch: `antigravity/AGR-20260809-002-mobile-dashboard-navigation-drawer`.
- If another frontend ticket is editing `app-shell.tsx`, `sidebar.tsx`, or `topbar.tsx`, stop and report the overlap instead of merging changes silently.
