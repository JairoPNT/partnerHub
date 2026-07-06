# PartnerHub Current Architecture Inventory

Ticket: `PH-002A`

Date: `2026-07-03`

Canonical workspace: `D:\Proyectos multi agentes\PartnerHub`

## 1. Folder Tree

Observed repository structure:

```text
PartnerHub/
  .claude/
  .git/
  AGENTS.md
  AI_CONTEXT.md
  ARCHITECTURE_DECISIONS.md
  CHANGELOG.md
  CONTRIBUTING.md
  Dockerfile
  README.md
  TICKETS.md
  PROJECT_BOARD.md
  brain/
  docs/
  app/
    web/
      app/
      components/
      docs/
      lib/
      modules/
      prisma/
      scripts/
      server/
```

The deployable application is concentrated in `app/web`.

## 2. Installed Tech Stack

Current confirmed stack in `app/web`:

- Next.js `16.2.10`
- React `19.2.7`
- React DOM `19.2.7`
- TypeScript `5.9.2`
- Tailwind CSS `3.4.17`
- Prisma `6.19.3`
- `next-auth` `4.24.14`
- `@next-auth/prisma-adapter` `1.0.7`
- Zod `3.25.76`
- Lucide React `1.23.0`
- ESLint `9.x` with flat config
- Prettier `3.6.2`
- Node `20-alpine` in Docker

## 3. Dependencies

The application dependencies are defined in [app/web/package.json](D:\Proyectos multi agentes\PartnerHub\app\web\package.json).

Key runtime dependencies:

- `next`
- `react`
- `react-dom`
- `next-auth`
- `@prisma/client`
- `@next-auth/prisma-adapter`
- `zod`
- `lucide-react`

Key development dependencies:

- `typescript`
- `prisma`
- `eslint`
- `@eslint/js`
- `typescript-eslint`
- `tailwindcss`
- `postcss`
- `autoprefixer`
- `prettier`

Notes:

- Root-level `package-lock.json` exists, but there is no root-level `package.json`.
- The real application dependency tree lives under `app/web`.

## 4. Existing Routes

Route sources in `app/web`:

- [app/web/app/page.tsx](D:\Proyectos multi agentes\PartnerHub\app\web\app\page.tsx)
- [app/web/app/not-found.tsx](D:\Proyectos multi agentes\PartnerHub\app\web\app\not-found.tsx)
- [app/web/app/(app)/layout.tsx](D:\Proyectos multi agentes\PartnerHub\app\web\app\(app)\layout.tsx)
- [app/web/app/(app)/[module]/page.tsx](D:\Proyectos multi agentes\PartnerHub\app\web\app\(app)\[module]\page.tsx)

Observed public routes:

- `/`
- `/_not-found`
- `/dashboard`
- `/partners`
- `/plans`
- `/payments`
- `/master-site`
- `/landing-builder`
- `/vsl-builder`
- `/creative-assets`
- `/campaigns`
- `/automations`
- `/domains`
- `/settings`

The module routes are generated from a single dynamic route plus `generateStaticParams`.

## 5. Existing Pages

Current page surfaces:

- Home landing page at `/`
- Dynamic module pages for each slug in the module catalog
- Not found page at `/_not-found`

There is no separate implemented feature page per module yet beyond the generic scaffold.

## 6. Existing Layouts

Current layouts:

- Root layout in [app/web/app/layout.tsx](D:\Proyectos multi agentes\PartnerHub\app\web\app\layout.tsx)
- App shell layout in [app/web/app/(app)/layout.tsx](D:\Proyectos multi agentes\PartnerHub\app\web\app\(app)\layout.tsx)

The shell layout provides the sidebar and topbar for module routes.

## 7. Existing React Components

App-level components:

- [components/app-shell.tsx](D:\Proyectos multi agentes\PartnerHub\app\web\components\app-shell.tsx)
- [components/sidebar.tsx](D:\Proyectos multi agentes\PartnerHub\app\web\components\sidebar.tsx)
- [components/topbar.tsx](D:\Proyectos multi agentes\PartnerHub\app\web\components\topbar.tsx)
- [components/module-page.tsx](D:\Proyectos multi agentes\PartnerHub\app\web\components\module-page.tsx)
- [components/dashboard-view.tsx](D:\Proyectos multi agentes\PartnerHub\app\web\components\dashboard-view.tsx)

Reusable UI primitives:

- [components/ui/button.tsx](D:\Proyectos multi agentes\PartnerHub\app\web\components\ui\button.tsx)
- [components/ui/card.tsx](D:\Proyectos multi agentes\PartnerHub\app\web\components\ui\card.tsx)
- [components/ui/badge.tsx](D:\Proyectos multi agentes\PartnerHub\app\web\components\ui\badge.tsx)
- [components/ui/alert.tsx](D:\Proyectos multi agentes\PartnerHub\app\web\components\ui\alert.tsx)
- [components/ui/table.tsx](D:\Proyectos multi agentes\PartnerHub\app\web\components\ui\table.tsx)
- [components/ui/form.tsx](D:\Proyectos multi agentes\PartnerHub\app\web\components\ui\form.tsx)

Observations:

- `dashboard-view.tsx` is a prototype dashboard component and is not wired to a route.
- The UI primitives are present but remain presentation-layer scaffolding.

## 8. Existing API Endpoints

No API route handlers exist yet.

Not present:

- `app/api/*`
- route handlers
- server actions that expose an API contract

## 9. Database Layer Status

The database layer is scaffolded but not operational in production terms.

Present:

- [app/web/prisma/schema.prisma](D:\Proyectos multi agentes\PartnerHub\app\web\prisma\schema.prisma)
- [app/web/server/db.ts](D:\Proyectos multi agentes\PartnerHub\app\web\server\db.ts)

Schema draft models:

- `User`
- `Partner`
- `Plan`
- `Site`
- `Payment`
- `MasterContent`
- `CreativeAsset`
- `Campaign`
- `AutomationRun`
- `Domain`

Status:

- Prisma schema exists.
- No migrations directory exists yet.
- No seeded data exists yet.
- No API or service layer is consuming the schema.

## 10. Authentication Status

Authentication is only a draft scaffold.

Present:

- [app/web/server/auth.ts](D:\Proyectos multi agentes\PartnerHub\app\web\server\auth.ts)
- auth-related env keys in [app/web/.env.example](D:\Proyectos multi agentes\PartnerHub\app\web\.env.example)

Missing:

- configured auth route
- provider integration
- session handling
- middleware protection
- authorization policies

## 11. Environment Variables

Current example environment file:

- [app/web/.env.example](D:\Proyectos multi agentes\PartnerHub\app\web\.env.example)

Defined variables:

- `DATABASE_URL`
- `AUTH_URL`
- `AUTH_SECRET`
- `NEXT_PUBLIC_APP_NAME`

## 12. Docker Configuration

Present:

- root [Dockerfile](D:\Proyectos multi agentes\PartnerHub\Dockerfile)
- root [.dockerignore](D:\Proyectos multi agentes\PartnerHub\.dockerignore)
- app-level [app/web/Dockerfile](D:\Proyectos multi agentes\PartnerHub\app\web\Dockerfile)
- app-level [app/web/.dockerignore](D:\Proyectos multi agentes\PartnerHub\app\web\.dockerignore)

Deployment behavior:

- The root Dockerfile is the deployment entrypoint used for Easypanel.
- The app-level Dockerfile is an app-local build artifact and should be treated carefully to avoid deployment ambiguity.

## 13. Scripts

Application scripts in [app/web/package.json](D:\Proyectos multi agentes\PartnerHub\app\web\package.json):

- `dev`
- `build`
- `start`
- `lint`
- `format`
- `db:generate`
- `db:studio`

Additional script scaffold:

- [app/web/scripts/seed.ts](D:\Proyectos multi agentes\PartnerHub\app\web\scripts\seed.ts)

## 14. Config Files

Current config files in `app/web`:

- [app/web/tsconfig.json](D:\Proyectos multi agentes\PartnerHub\app\web\tsconfig.json)
- [app/web/tailwind.config.ts](D:\Proyectos multi agentes\PartnerHub\app\web\tailwind.config.ts)
- [app/web/postcss.config.mjs](D:\Proyectos multi agentes\PartnerHub\app\web\postcss.config.mjs)
- [app/web/eslint.config.mjs](D:\Proyectos multi agentes\PartnerHub\app\web\eslint.config.mjs)
- [app/web/next.config.mjs](D:\Proyectos multi agentes\PartnerHub\app\web\next.config.mjs)
- [app/web/next-env.d.ts](D:\Proyectos multi agentes\PartnerHub\app\web\next-env.d.ts)
- [app/web/.prettierrc.json](D:\Proyectos multi agentes\PartnerHub\app\web\.prettierrc.json)
- [app/web/.prettierignore](D:\Proyectos multi agentes\PartnerHub\app\web\.prettierignore)

Repository-level governance/config files:

- [README.md](D:\Proyectos multi agentes\PartnerHub\README.md)
- [AGENTS.md](D:\Proyectos multi agentes\PartnerHub\AGENTS.md)
- [AI_CONTEXT.md](D:\Proyectos multi agentes\PartnerHub\AI_CONTEXT.md)
- [ARCHITECTURE_DECISIONS.md](D:\Proyectos multi agentes\PartnerHub\ARCHITECTURE_DECISIONS.md)
- [CHANGELOG.md](D:\Proyectos multi agentes\PartnerHub\CHANGELOG.md)
- [CONTRIBUTING.md](D:\Proyectos multi agentes\PartnerHub\CONTRIBUTING.md)
- [PROJECT_BOARD.md](D:\Proyectos multi agentes\PartnerHub\PROJECT_BOARD.md)
- [TICKETS.md](D:\Proyectos multi agentes\PartnerHub\TICKETS.md)
- [package-lock.json](D:\Proyectos multi agentes\PartnerHub\package-lock.json)

## 15. Current Folder Responsibilities

Current responsibility mapping:

- `brain/` stores local AI operating memory and live project state.
- `docs/` stores product, architecture, design, development, automation, and deployment documentation.
- `app/web/` stores the deployable Next.js application scaffold.
- `app/web/components/` stores reusable frontend components and UI primitives.
- `app/web/lib/` stores shared utilities and product metadata.
- `app/web/modules/` stores module registry and route metadata.
- `app/web/server/` stores backend helper scaffolds for auth, database, and env validation.
- `app/web/prisma/` stores the data model draft.
- `app/web/scripts/` stores maintenance and seed placeholders.
- Root files store governance, architecture, and ticketing memory.

## 16. Missing Modules

The module catalog exists, but the real feature implementations are still missing.

Missing backend/business modules:

- Dashboard services and API
- Partner lifecycle services
- Plan billing logic
- Payment processing logic
- Master content services
- Landing builder workflows
- VSL builder workflows
- Creative asset management
- Campaign orchestration
- Automation runtime integration
- Domain lifecycle management
- Settings and authorization policies

Missing platform modules:

- API route handlers
- migrations
- seed data
- auth providers
- middleware
- test suite
- observability
- audit logging

## 17. Technical Risks

- The architecture is scaffolded, but there is still no backend feature execution path.
- Root `package-lock.json` exists without a root `package.json`, which can confuse tooling.
- There are two Dockerfiles; only the root one should be used for deployment.
- The codebase mixes a presentation scaffold with backend drafts in one app boundary.
- No API routes exist, so frontend routes are currently data-less shell pages.
- No migration history exists, so database evolution is not yet governed.

## 18. Technical Debt

- Duplicate or overlapping governance docs across root and `brain/`.
- Prototype UI component (`dashboard-view.tsx`) is not wired to the current route system.
- Auth and Prisma are scaffolded but not operational.
- The repository still needs a real backend service layer and API contract.
- Some imported legacy text in the UI/catalog files still shows encoding drift from prior documentation imports.

## 19. Scalability Observations

- The module catalog pattern is a good starting point for feature-based expansion.
- The current single-app `app/web` boundary is acceptable for a scaffold, but the backend domain layer is not yet cleanly separated.
- Multi-tenant intent is present in docs and schema naming, but tenant isolation is not enforced in code yet.
- The architecture is not yet ready for high-volume tenant operations without additional domain, persistence, and authorization layers.

## 20. Architecture Observations

- The repository now has a real SaaS scaffold instead of only documentation.
- The current implementation is still a shell-first architecture, not a feature-complete backend platform.
- The backend lead area is present as helpers and schema drafts, but there is no runtime API surface yet.
- The root Docker entrypoint and `app/web` app boundary are compatible with deployment, but the codebase needs stricter separation before feature scale increases.

