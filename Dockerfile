FROM node:20-alpine AS base
WORKDIR /repo
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS deps
WORKDIR /repo/app/web
COPY app/web/package.json app/web/package-lock.json ./
RUN npm ci

FROM base AS sftp-runtime-deps
WORKDIR /repo/sftp-runtime
COPY app/web/runtime-deps/sftp/package.json app/web/runtime-deps/sftp/package-lock.json ./
COPY app/web/runtime-deps/sftp/smoke.mjs ./smoke.mjs
RUN npm ci --omit=dev --omit=optional --ignore-scripts
RUN node smoke.mjs

FROM base AS builder
WORKDIR /repo
COPY --from=deps /repo/app/web/node_modules ./app/web/node_modules
COPY app/web ./app/web
COPY plantillas-de-pagina/producto ./plantillas-de-pagina/producto
COPY plantillas-de-pagina/business ./plantillas-de-pagina/business
COPY plantillas-de-pagina/personal-brand ./plantillas-de-pagina/personal-brand
COPY plantillas-de-pagina/personal-brand/config.js ./runtime-assets/personal-brand-config.js
COPY plantillas-de-pagina/business/config.js ./runtime-assets/business-config.js
COPY runtime-assets/business-consent-successor ./runtime-assets/business-consent-successor
WORKDIR /repo/app/web
RUN npm run build
RUN npx esbuild server/runtime/jairoBusinessInProcessProvisioner.ts --bundle --platform=node --format=esm --target=node20 --outfile=/repo/runtime-assets/jairo-business-in-process-provisioner.mjs
RUN npx esbuild server/runtime/jairoBusinessPackageGenerator.ts --bundle --platform=node --format=esm --target=node20 --alias:server-only=./server/runtime/serverOnlyRuntimeShim.mjs --outfile=/repo/runtime-assets/jairo-business-package-generator.mjs
RUN npx esbuild server/services/productMutationCoordinator.ts --bundle --platform=node --format=esm --target=node20 --alias:server-only=./server/runtime/serverOnlyRuntimeShim.mjs --outfile=/repo/runtime-assets/product-mutation-coordinator.mjs
RUN npx esbuild scripts/business-consent-master-package-migration.mjs --bundle --platform=node --format=esm --target=node20 --alias:server-only=./server/runtime/serverOnlyRuntimeShim.mjs --outfile=/repo/runtime-assets/business-consent-master-package-migration.mjs
RUN npx esbuild scripts/business-cutover-maintenance.ts --bundle --platform=node --format=esm --target=node20 --alias:server-only=./server/runtime/serverOnlyRuntimeShim.mjs --outfile=/repo/runtime-assets/business-cutover-maintenance.mjs
RUN node --input-type=module -e "import('/repo/runtime-assets/business-cutover-maintenance.mjs').then(m => { if (m.BUSINESS_CUTOVER_PROTOCOL_VERSION !== 'business-cutover-v1' || typeof m.readBusinessCutoverStatus !== 'function') process.exit(1); })"
RUN node --input-type=module -e "import('/repo/runtime-assets/product-mutation-coordinator.mjs').then(m => { if (m.PRODUCT_MUTATION_COORDINATION_VERSION !== 'product-mutation-v1' || typeof m.createProductMutationCoordinator !== 'function') process.exit(1); })"
RUN node scripts/assemble-business-cutover-runtime.mjs

FROM node:20-alpine AS runtime-layout
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PRODUCT_PAGE_TEMPLATE_DIR=/app/plantillas-de-pagina/producto
ENV PRODUCT_PAGE_OUTPUT_DIR=/data/generated-sites

COPY --from=builder /repo/app/web/package.json ./package.json
COPY --from=builder /repo/app/web/package-lock.json ./package-lock.json
COPY --from=builder /repo/app/web/public ./public
COPY --from=builder /repo/business-cutover-standalone ./
COPY --from=builder /repo/app/web/.next/static ./.next/static
RUN find /app/.next/static -type f -links 1 -exec chmod go-w {} +
COPY --from=sftp-runtime-deps /repo/sftp-runtime/node_modules ./scripts/node_modules
COPY --from=builder /repo/plantillas-de-pagina/producto ./plantillas-de-pagina/producto
COPY --from=builder /repo/plantillas-de-pagina/business ./plantillas-de-pagina/business
COPY --from=builder /repo/plantillas-de-pagina/personal-brand ./plantillas-de-pagina/personal-brand
COPY --from=builder /repo/runtime-assets/personal-brand-config.js ./runtime-assets/personal-brand-config.js
COPY --from=builder /repo/runtime-assets/business-config.js ./runtime-assets/business-config.js
COPY --from=builder /repo/runtime-assets/business-consent-successor ./runtime-assets/business-consent-successor
COPY --from=builder /repo/runtime-assets/jairo-business-in-process-provisioner.mjs ./runtime-assets/jairo-business-in-process-provisioner.mjs
COPY --from=builder /repo/runtime-assets/jairo-business-package-generator.mjs ./runtime-assets/jairo-business-package-generator.mjs
COPY --from=builder /repo/runtime-assets/product-mutation-coordinator.mjs ./runtime-assets/product-mutation-coordinator.mjs
COPY --from=builder /repo/app/web/scripts/product-destination-reconcile.mjs ./scripts/product-destination-reconcile.mjs
COPY --from=builder /repo/app/web/scripts/claudia-source-identity-dry-run.mjs ./scripts/claudia-source-identity-dry-run.mjs
COPY --from=builder /repo/app/web/scripts/jairo-source-identity-dry-run.mjs ./scripts/jairo-source-identity-dry-run.mjs
COPY --from=builder /repo/app/web/scripts/jairo-source-identity-guarded-apply.mjs ./scripts/jairo-source-identity-guarded-apply.mjs
COPY --from=builder /repo/app/web/scripts/jairo-business-source-generation-dry-run.mjs ./scripts/jairo-business-source-generation-dry-run.mjs
COPY --from=builder /repo/app/web/scripts/jairo-business-source-guarded-apply.mjs ./scripts/jairo-business-source-guarded-apply.mjs
COPY --from=builder /repo/app/web/scripts/jairo-business-publishing-preflight.mjs ./scripts/jairo-business-publishing-preflight.mjs
COPY --from=builder /repo/app/web/scripts/guarded-ecosystem-publication.mjs ./scripts/guarded-ecosystem-publication.mjs
COPY --from=builder /repo/app/web/scripts/sftp-directory-rename-capability-probe.mjs ./scripts/sftp-directory-rename-capability-probe.mjs
COPY --from=builder /repo/app/web/scripts/prepare-jairo-business-sftp-capability-preview.mjs ./scripts/prepare-jairo-business-sftp-capability-preview.mjs
COPY --from=builder /repo/app/web/scripts/prepare-jairo-business-publication-preview.mjs ./scripts/prepare-jairo-business-publication-preview.mjs
COPY --from=builder /repo/app/web/scripts/prepare-jairo-personal-brand-publication-preview.mjs ./scripts/prepare-jairo-personal-brand-publication-preview.mjs
COPY --from=builder /repo/app/web/scripts/jairo-business-master-package.mjs ./scripts/jairo-business-master-package.mjs
COPY --from=builder /repo/app/web/scripts/jairo-business-master-package-drift-recovery.mjs ./scripts/jairo-business-master-package-drift-recovery.mjs
COPY --from=builder /repo/app/web/scripts/business-master-transition-lifecycle.mjs ./scripts/business-master-transition-lifecycle.mjs
COPY --from=builder /repo/runtime-assets/business-consent-master-package-migration.mjs ./scripts/business-consent-master-package-migration.mjs
COPY --from=builder /repo/runtime-assets/business-cutover-maintenance.mjs ./scripts/business-cutover-maintenance.mjs
COPY --from=builder /repo/app/web/scripts/jairo-personal-brand-master-package.mjs ./scripts/jairo-personal-brand-master-package.mjs
COPY --from=builder /repo/app/web/scripts/jairo-business-sftp-capability-renewal.mjs ./scripts/jairo-business-sftp-capability-renewal.mjs
COPY --from=builder /repo/app/web/scripts/jairo-business-guarded-provisioning.mjs ./scripts/jairo-business-guarded-provisioning.mjs
COPY --from=builder /repo/app/web/scripts/prepare-jairo-business-provisioning-preview.mjs ./scripts/prepare-jairo-business-provisioning-preview.mjs
COPY --from=builder /repo/app/web/scripts/jairo-business-provisioning-recovery-diagnostic.mjs ./scripts/jairo-business-provisioning-recovery-diagnostic.mjs
COPY --from=builder /repo/app/web/scripts/jairo-business-provisioning-guarded-resume.mjs ./scripts/jairo-business-provisioning-guarded-resume.mjs
COPY --from=builder /repo/app/web/scripts/jairo-business-provisioning-dynamic-recovery.mjs ./scripts/jairo-business-provisioning-dynamic-recovery.mjs
COPY --from=builder /repo/app/web/scripts/jairo-hostinger-dns-readonly-diagnostic.mjs ./scripts/jairo-hostinger-dns-readonly-diagnostic.mjs
COPY --from=builder /repo/app/web/scripts/jairo-hostinger-dns-payload-validation.mjs ./scripts/jairo-hostinger-dns-payload-validation.mjs
COPY --from=builder /repo/app/web/scripts/jairo-hostinger-dns-hostname-collision-diagnostic.mjs ./scripts/jairo-hostinger-dns-hostname-collision-diagnostic.mjs
COPY --from=builder /repo/app/web/scripts/prepare-jairo-business-entitlement-snapshot.mjs ./scripts/prepare-jairo-business-entitlement-snapshot.mjs
COPY --from=builder /repo/app/web/scripts/jairo-whatsapp-guarded-correction.mjs ./scripts/jairo-whatsapp-guarded-correction.mjs
COPY --from=builder /repo/app/web/shared/business-vsl-poster-contract.mjs ./shared/business-vsl-poster-contract.mjs
COPY --from=builder /repo/app/web/shared/partner-whatsapp-identity.mjs ./shared/partner-whatsapp-identity.mjs
COPY --from=builder /repo/app/web/scripts/all-partner-source-identity-dry-run.mjs ./scripts/all-partner-source-identity-dry-run.mjs
COPY --from=builder /repo/app/web/scripts/cleanup-jairo-pinto-test-referrals.mjs ./scripts/cleanup-jairo-pinto-test-referrals.mjs
COPY --from=builder /repo/app/web/scripts/reconcile-claudia-heroes.mjs ./scripts/reconcile-claudia-heroes.mjs
COPY --from=builder /repo/app/web/scripts/wompi-reconcile-sandbox.mjs ./scripts/wompi-reconcile-sandbox.mjs
RUN find /app -type d -exec chmod go-w {} + && find /app -type f -links 1 -exec chmod go-w {} +

# Build tooling stays OUTSIDE /app. Inventory includes every regular shipped
# writer/dependency byte; only the exact inventory sidecar and CLI are excluded.
COPY --from=builder /repo/app/web/scripts/build-business-cutover-writer-inventory.mjs /tmp/build-business-cutover-writer-inventory.mjs
RUN node --input-type=module -e "import { writeFile, unlink } from 'node:fs/promises'; import { buildBusinessCutoverWriterInventory } from '/tmp/build-business-cutover-writer-inventory.mjs'; let inventory; try { inventory = await buildBusinessCutoverWriterInventory(); } catch (error) { if (error.message !== 'BUSINESS_CUTOVER_ARTIFACTS_UNAVAILABLE') throw error; inventory = null; } await writeFile('/app/runtime-assets/business-cutover-writer-inventory.json', JSON.stringify(inventory), { mode: 0o644 }); await unlink('/tmp/build-business-cutover-writer-inventory.mjs');"

FROM builder AS cutover-cli-builder
COPY --from=runtime-layout /app /app
RUN node --input-type=module -e "import { readFile } from 'node:fs/promises'; import { createHash } from 'node:crypto'; import { build } from 'esbuild'; import { validateBusinessCutoverWriterInventory } from './scripts/build-business-cutover-writer-inventory.mjs'; const bytes = await readFile('/app/runtime-assets/business-cutover-writer-inventory.json'); const inventory = JSON.parse(bytes); if (inventory !== null) validateBusinessCutoverWriterInventory(inventory); if (JSON.stringify(inventory) !== bytes.toString()) throw new Error('BUSINESS_CUTOVER_PROFILE_INVALID'); const descriptor = inventory === null ? null : { version: 1, releaseId: inventory.releaseId, inventorySha256: createHash('sha256').update(bytes).digest('hex') }; await build({ entryPoints: ['scripts/business-consent-cutover.ts'], bundle: true, platform: 'node', format: 'esm', target: 'node20', alias: { 'server-only': './server/runtime/serverOnlyRuntimeShim.mjs' }, define: { __BUSINESS_CUTOVER_RELEASE_DESCRIPTOR__: JSON.stringify(descriptor) }, outfile: '/repo/runtime-assets/business-consent-cutover.mjs' });"
RUN node --input-type=module -e "const m = await import('/repo/runtime-assets/business-consent-cutover.mjs'); if (JSON.stringify(Object.keys(m).sort()) !== JSON.stringify(['parseBusinessConsentCutoverArguments', 'runBusinessConsentCutover'])) process.exit(1);"

FROM runtime-layout AS runner
COPY --from=cutover-cli-builder /repo/runtime-assets/business-consent-cutover.mjs ./scripts/business-consent-cutover.mjs

EXPOSE 3000
CMD ["node", "server.js"]
