import 'server-only';

import { businessLandingContentPutSchema, businessLandingContentQuerySchema, businessLandingContentResponseSchema } from '@/shared/business-landing-content-contract';
import { authorizeMasterSitesOperator, MasterSitesOperatorAuthError } from '@/server/auth/masterSitesOperatorAuth';
import { createMasterSitesBusinessContentService, MasterSitesBusinessContentError } from '@/server/services/masterSitesBusinessContentService';
import { BusinessSiteBusyError } from '@/server/services/businessPublicationSiteCoordinator';

const json = (body: unknown, status: number) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
const failure = (error: string, status: number) => json({ error }, status);
function safeError(error: unknown) {
  if (error instanceof MasterSitesOperatorAuthError) return failure(error.code, error.status);
  if (error instanceof MasterSitesBusinessContentError) return failure(error.code, 409);
  if (error instanceof BusinessSiteBusyError) return failure('BUSINESS_SITE_BUSY', 409);
  if (error instanceof Error) {
    if (error.message === 'MASTER_SITES_PARTNER_NOT_FOUND') return failure(error.message, 404);
    if (error.message === 'BUSINESS_CONTENT_SOURCE_CONFLICT') return failure('MASTER_SITES_REVIEW_CONFLICT', 409);
    if (['BUSINESS_CONTENT_SOURCE_IDENTITY_INVALID', 'BUSINESS_CONTENT_SOURCE_PATH_INVALID'].includes(error.message))
      return failure('MASTER_SITES_CONTENT_BLOCKED', 409);
  }
  return failure('MASTER_SITES_INTERNAL_ERROR', 500);
}

export function createMasterSitesBusinessContentRouteHandlers(options: {
  authorize?: typeof authorizeMasterSitesOperator;
  service?: () => ReturnType<typeof createMasterSitesBusinessContentService>;
} = {}) {
  const authorize = options.authorize ?? authorizeMasterSitesOperator;
  const service = options.service ?? (() => createMasterSitesBusinessContentService());
  return {
    async GET(request: Request) {
      try {
        await authorize(request);
        if (request.method !== 'GET') return failure('MASTER_SITES_METHOD_NOT_ALLOWED', 405);
        const query = new URL(request.url).searchParams;
        // Object.fromEntries alone would silently accept duplicate identity keys.
        if ([...query.keys()].some((key) => query.getAll(key).length !== 1)) return failure('MASTER_SITES_INVALID_REQUEST', 400);
        const parsed = businessLandingContentQuerySchema.safeParse(Object.fromEntries(query));
        if (!parsed.success) return failure('MASTER_SITES_INVALID_REQUEST', 400);
        return json(businessLandingContentResponseSchema.parse(await service().get(parsed.data.activationLeadId)), 200);
      } catch (error) { return safeError(error); }
    },
    async PUT(request: Request) {
      try {
        await authorize(request);
        if (request.method !== 'PUT') return failure('MASTER_SITES_METHOD_NOT_ALLOWED', 405);
        // Existing authorizer protects POST only. Match its administrative write
        // requirements here without broadening permissions on any other route.
        if (request.headers.get('origin') !== 'https://app.partnerhub.club') return failure('MASTER_SITES_ORIGIN_FORBIDDEN', 403);
        if (request.headers.get('content-type')?.split(';', 1)[0].trim().toLowerCase() !== 'application/json') return failure('MASTER_SITES_JSON_REQUIRED', 400);
        let value: unknown;
        try { value = await request.json(); } catch { return failure('MASTER_SITES_INVALID_REQUEST', 400); }
        const parsed = businessLandingContentPutSchema.safeParse(value);
        if (!parsed.success) return failure('MASTER_SITES_INVALID_REQUEST', 400);
        return json(businessLandingContentResponseSchema.parse(await service().put(parsed.data)), 200);
      } catch (error) { return safeError(error); }
    }
  };
}
