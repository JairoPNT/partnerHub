import { createMasterSitesBusinessContentRouteHandlers } from '@/server/services/masterSitesBusinessContentRouteHandlers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const { GET, PUT } = createMasterSitesBusinessContentRouteHandlers();
