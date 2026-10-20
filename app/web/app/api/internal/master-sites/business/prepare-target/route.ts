import { createMasterSitesBusinessRouteHandlers } from '@/server/services/masterSitesBusinessRouteHandlers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const POST = createMasterSitesBusinessRouteHandlers().prepareTarget;
