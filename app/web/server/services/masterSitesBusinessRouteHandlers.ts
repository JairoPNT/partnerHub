import 'server-only';

import {
  masterSitesBusinessReadResponseSchema, masterSitesBusinessCommandResultSchema,
  masterSitesBusinessPrepareTargetRequestSchema, masterSitesBusinessPublishRequestSchema, masterSitesErrorResponseSchema
} from '@/shared/master-sites-business-contract';
import { authorizeMasterSitesOperator, MasterSitesOperatorAuthError } from '@/server/auth/masterSitesOperatorAuth';
import { createMasterSitesBusinessPreviewService } from '@/server/services/masterSitesBusinessPreviewService';
import { createMasterSitesBusinessCommandService, MasterSitesBusinessCommandError } from '@/server/services/masterSitesBusinessCommandService';
import { MasterSitesBusinessOperationStoreError } from '@/server/services/masterSitesBusinessOperationStore';
import { BusinessSiteBusyError } from '@/server/services/businessPublicationSiteCoordinator';
import { ProvisioningError } from '@/server/services/subdomainProvisioningService';

type Services = {
  preview: ReturnType<typeof createMasterSitesBusinessPreviewService>;
  commands: ReturnType<typeof createMasterSitesBusinessCommandService>;
};
export type MasterSitesBusinessRouteHandlerOptions = {
  authorize?: typeof authorizeMasterSitesOperator;
  services?: () => Services;
};
const json = (body: unknown, status: number) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
const failure = (code: string, status: number, reasons: string[] = []) =>
  json(masterSitesErrorResponseSchema.parse({ error: code, ...(reasons.length ? { blockedReasons: reasons } : {}) }), status);

function safeError(error: unknown) {
  if (error instanceof MasterSitesOperatorAuthError) return failure(error.code, error.status);
  if (error instanceof MasterSitesBusinessCommandError) return failure(error.code, error.status, error.blockedReasons);
  if (error instanceof MasterSitesBusinessOperationStoreError) return failure(error.code, 409);
  if (error instanceof BusinessSiteBusyError) return failure('BUSINESS_SITE_BUSY', 409);
  if (error instanceof ProvisioningError) return failure('MASTER_SITES_PROVISIONING_FAILED', 409);
  if (error instanceof Error) {
    if (error.message === 'MASTER_SITES_PARTNER_NOT_FOUND') return failure(error.message, 404);
    // Explicit allowlist only. Never reflect provider, filesystem or Zod prose.
    if (['PUBLICATION_JOB_BUSY', 'PUBLICATION_JOB_CORRUPT', 'PUBLICATION_JOB_REVIEWED_INTENT_DRIFT',
      'PUBLICATION_JOB_BUSINESS_MASTER_REFRESH_IN_PROGRESS', 'PUBLICATION_JOB_IDEMPOTENCY_CONFLICT'].includes(error.message))
      return failure(error.message, 409);
  }
  return failure('MASTER_SITES_INTERNAL_ERROR', 500);
}

export function createMasterSitesBusinessRouteHandlers(options: MasterSitesBusinessRouteHandlerOptions = {}) {
  const authorize = options.authorize ?? authorizeMasterSitesOperator;
  const services = options.services ?? (() => ({
    preview: createMasterSitesBusinessPreviewService(), commands: createMasterSitesBusinessCommandService()
  }));
  async function GET(request: Request) {
    try {
      await authorize(request);
      if (request.method !== 'GET') return failure('MASTER_SITES_METHOD_NOT_ALLOWED', 405);
      return json(masterSitesBusinessReadResponseSchema.parse(await services().preview.get()), 200);
    } catch (error) { return safeError(error); }
  }
  async function post(request: Request, action: 'prepareTarget' | 'publish') {
    try {
      const operator = await authorize(request);
      if (request.method !== 'POST') return failure('MASTER_SITES_METHOD_NOT_ALLOWED', 405);
      let body: unknown;
      try { body = await request.json(); } catch { return failure('MASTER_SITES_INVALID_REQUEST', 400); }
      // Parse before dependency creation; these schemas reject arrays and all
      // untrusted identity/provider/content/route fields.
      const parsed = action === 'prepareTarget'
        ? masterSitesBusinessPrepareTargetRequestSchema.safeParse(body)
        : masterSitesBusinessPublishRequestSchema.safeParse(body);
      if (!parsed.success) return failure('MASTER_SITES_INVALID_REQUEST', 400);
      const commands = services().commands;
      const response = action === 'prepareTarget'
        ? await commands.prepareTarget(masterSitesBusinessPrepareTargetRequestSchema.parse(parsed.data), operator)
        : await commands.publish(masterSitesBusinessPublishRequestSchema.parse(parsed.data), operator);
      const safe = masterSitesBusinessCommandResultSchema.parse(response);
      const status = ['BLOCKED', 'RETRY_REQUIRED'].includes(safe.outcome) ? 409
        : ['ENQUEUED', 'TARGET_PENDING'].includes(safe.outcome) ? 202 : 200;
      return json(safe, status);
    } catch (error) { return safeError(error); }
  }
  return { GET, prepareTarget: (request: Request) => post(request, 'prepareTarget'), publish: (request: Request) => post(request, 'publish') };
}
