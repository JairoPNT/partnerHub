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
COPY plantillas-de-pagina/business/config.js ./runtime-assets/business-config.js
WORKDIR /repo/app/web
RUN npm run build
RUN npx esbuild server/runtime/jairoBusinessInProcessProvisioner.ts --bundle --platform=node --format=esm --target=node20 --outfile=/repo/runtime-assets/jairo-business-in-process-provisioner.mjs

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
COPY --from=builder /repo/runtime-assets/business-config.js ./runtime-assets/business-config.js
COPY --from=builder /repo/runtime-assets/jairo-business-in-process-provisioner.mjs ./runtime-assets/jairo-business-in-process-provisioner.mjs
COPY --from=builder /repo/app/web/scripts/claudia-source-identity-dry-run.mjs ./scripts/claudia-source-identity-dry-run.mjs
COPY --from=builder /repo/app/web/scripts/jairo-source-identity-dry-run.mjs ./scripts/jairo-source-identity-dry-run.mjs
COPY --from=builder /repo/app/web/scripts/jairo-source-identity-guarded-apply.mjs ./scripts/jairo-source-identity-guarded-apply.mjs
COPY --from=builder /repo/app/web/scripts/jairo-business-source-generation-dry-run.mjs ./scripts/jairo-business-source-generation-dry-run.mjs
COPY --from=builder /repo/app/web/scripts/jairo-business-source-guarded-apply.mjs ./scripts/jairo-business-source-guarded-apply.mjs
COPY --from=builder /repo/app/web/scripts/jairo-business-publishing-preflight.mjs ./scripts/jairo-business-publishing-preflight.mjs
COPY --from=builder /repo/app/web/scripts/guarded-ecosystem-publication.mjs ./scripts/guarded-ecosystem-publication.mjs
COPY --from=builder /repo/app/web/scripts/sftp-directory-rename-capability-probe.mjs ./scripts/sftp-directory-rename-capability-probe.mjs
COPY --from=builder /repo/app/web/scripts/jairo-business-guarded-provisioning.mjs ./scripts/jairo-business-guarded-provisioning.mjs
COPY --from=builder /repo/app/web/scripts/prepare-jairo-business-entitlement-snapshot.mjs ./scripts/prepare-jairo-business-entitlement-snapshot.mjs
COPY --from=builder /repo/app/web/scripts/jairo-whatsapp-guarded-correction.mjs ./scripts/jairo-whatsapp-guarded-correction.mjs
COPY --from=builder /repo/app/web/shared/business-vsl-poster-contract.mjs ./shared/business-vsl-poster-contract.mjs
COPY --from=builder /repo/app/web/shared/partner-whatsapp-identity.mjs ./shared/partner-whatsapp-identity.mjs
COPY --from=builder /repo/app/web/scripts/all-partner-source-identity-dry-run.mjs ./scripts/all-partner-source-identity-dry-run.mjs
COPY --from=builder /repo/app/web/scripts/cleanup-jairo-pinto-test-referrals.mjs ./scripts/cleanup-jairo-pinto-test-referrals.mjs
COPY --from=builder /repo/app/web/scripts/reconcile-claudia-heroes.mjs ./scripts/reconcile-claudia-heroes.mjs
COPY --from=builder /repo/app/web/scripts/wompi-reconcile-sandbox.mjs ./scripts/wompi-reconcile-sandbox.mjs

EXPOSE 3000
CMD ["node", "server.js"]
