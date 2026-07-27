# Deployment

## Docker

Containers should be used to standardize local development and deployment behavior.

## CI/CD

The delivery pipeline should validate quality, security, and compatibility before production rollout.

Recommended checks:

- linting
- tests
- build verification
- migration safety checks
- deployment packaging

## Environments

The platform should support at least:

- local development
- integration or test
- staging
- production

## Hosting Split

- The VPS should run the PartnerHub SaaS, admin panel, API, database, orchestration, and cost tracking.
- The separate web hosting account should serve generated public websites, product landings, and VSL pages.
- Treat generated sites as static or lightweight artifacts when possible.
- Avoid assuming that rendering, storage, and publishing all happen inside the VPS.

## Deployment Principles

- Keep configuration external to application code.
- Avoid environment drift.
- Make rollbacks practical.
- Protect secrets and credentials carefully.
- Track external usage costs for generation, storage, hosting, orchestration, and future media spend.
