FROM node:20-alpine AS base
WORKDIR /repo
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS deps
WORKDIR /repo/app/web
COPY app/web/package.json app/web/package-lock.json ./
RUN npm ci

FROM base AS builder
WORKDIR /repo
COPY --from=deps /repo/app/web/node_modules ./app/web/node_modules
COPY app/web ./app/web
COPY plantillas-de-pagina/producto ./plantillas-de-pagina/producto
COPY plantillas-de-pagina/personal-brand/config.js ./runtime-assets/personal-brand-config.js
WORKDIR /repo/app/web
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PRODUCT_PAGE_TEMPLATE_DIR=/app/plantillas-de-pagina/producto
ENV PRODUCT_PAGE_OUTPUT_DIR=/data/generated-sites

COPY --from=builder /repo/app/web/package.json ./package.json
COPY --from=builder /repo/app/web/package-lock.json ./package-lock.json
COPY --from=builder /repo/app/web/public ./public
COPY --from=builder /repo/app/web/.next/standalone ./
COPY --from=builder /repo/app/web/.next/static ./.next/static
COPY --from=builder /repo/plantillas-de-pagina/producto ./plantillas-de-pagina/producto
COPY --from=builder /repo/runtime-assets/personal-brand-config.js ./runtime-assets/personal-brand-config.js
COPY --from=builder /repo/app/web/scripts/claudia-source-identity-dry-run.mjs ./scripts/claudia-source-identity-dry-run.mjs
COPY --from=builder /repo/app/web/scripts/jairo-source-identity-dry-run.mjs ./scripts/jairo-source-identity-dry-run.mjs
COPY --from=builder /repo/app/web/scripts/jairo-source-identity-guarded-apply.mjs ./scripts/jairo-source-identity-guarded-apply.mjs
COPY --from=builder /repo/app/web/scripts/all-partner-source-identity-dry-run.mjs ./scripts/all-partner-source-identity-dry-run.mjs
COPY --from=builder /repo/app/web/scripts/cleanup-jairo-pinto-test-referrals.mjs ./scripts/cleanup-jairo-pinto-test-referrals.mjs
COPY --from=builder /repo/app/web/scripts/reconcile-claudia-heroes.mjs ./scripts/reconcile-claudia-heroes.mjs
COPY --from=builder /repo/app/web/scripts/wompi-reconcile-sandbox.mjs ./scripts/wompi-reconcile-sandbox.mjs

EXPOSE 3000
CMD ["node", "server.js"]
