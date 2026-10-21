import 'server-only';

import { businessLandingContentPutSchema, businessLandingContentQuerySchema, businessLandingContentResponseSchema } from '@/shared/business-landing-content-contract';
import { createMasterSitesBusinessPreviewService, type BusinessPartnerSnapshot } from '@/server/services/masterSitesBusinessPreviewService';
import { productPageSourceService } from '@/server/services/productPageSourceService';
import { withBusinessPublicationSite } from '@/server/services/businessPublicationSiteCoordinator';

export class MasterSitesBusinessContentError extends Error {
  readonly code: 'MASTER_SITES_CONTENT_BLOCKED' | 'MASTER_SITES_REVIEW_CONFLICT';
  constructor(code: 'MASTER_SITES_CONTENT_BLOCKED' | 'MASTER_SITES_REVIEW_CONFLICT') { super(code); this.code = code; }
}

function eligible(snapshot: BusinessPartnerSnapshot) {
  if (!snapshot.siteId || !snapshot.publicHost || !snapshot.input ||
    snapshot.entitlement?.activationLeadId !== snapshot.activationLeadId ||
    !snapshot.entitlement.includedEcosystems.includes('BUSINESS') ||
    ['BLOCKED', 'QUEUED', 'RUNNING'].includes(snapshot.partner.status))
    throw new MasterSitesBusinessContentError('MASTER_SITES_CONTENT_BLOCKED');
  return { siteId: snapshot.siteId, publicHost: snapshot.publicHost, input: snapshot.input };
}

function projection(snapshot: BusinessPartnerSnapshot) {
  const { siteId, publicHost } = eligible(snapshot);
  return businessLandingContentResponseSchema.parse({
    activationLeadId: snapshot.activationLeadId, displayName: snapshot.partner.displayName,
    siteId, publicHost, revision: snapshot.reviewRevision,
    profile: snapshot.source?.businessLandingContent ?? null
  });
}

export function createMasterSitesBusinessContentService(options: {
  preview?: Pick<ReturnType<typeof createMasterSitesBusinessPreviewService>, 'getPartner'>;
  sources?: Pick<typeof productPageSourceService, 'updateBusinessLandingContent'>;
} = {}) {
  const preview = options.preview ?? createMasterSitesBusinessPreviewService();
  const sources = options.sources ?? productPageSourceService;
  return {
    async get(activationLeadId: string) {
      businessLandingContentQuerySchema.parse({ activationLeadId });
      return projection(await preview.getPartner(activationLeadId));
    },
    async put(value: unknown) {
      const request = businessLandingContentPutSchema.parse(value);
      const initial = eligible(await preview.getPartner(request.activationLeadId));
      return withBusinessPublicationSite(initial.siteId, async () => {
        // Re-resolve identity, authorization-relevant entitlement and revision
        // inside the same site lock used by generation and publication.
        const snapshot = await preview.getPartner(request.activationLeadId);
        const current = eligible(snapshot);
        if (current.siteId !== initial.siteId || snapshot.reviewRevision !== request.expectedRevision)
          throw new MasterSitesBusinessContentError('MASTER_SITES_REVIEW_CONFLICT');
        await sources.updateBusinessLandingContent({ siteId: current.siteId,
          expectedSourceHash: snapshot.sourceHash, sourceConfiguration: current.input, profile: request.profile });
        return projection(await preview.getPartner(request.activationLeadId));
      });
    }
  };
}
