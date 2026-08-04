import { NextResponse } from "next/server";

import { productPageSourceService } from "@/server/services/productPageSourceService";
import { productPageVerificationService } from "@/server/services/productPageVerificationService";
import { productPageHistoryService } from "@/server/services/productPageHistoryService";

export const runtime = "nodejs";

export async function GET() {
  try {
    const sites = await productPageSourceService.list();
    const sitesWithVerification = await Promise.all(
      sites.map(async (site) => {
        const history = await productPageHistoryService.get(site.siteId);

        return {
          ...site,
          lastVerification: await productPageVerificationService.getLastVerification(site.siteId),
          lastHistoryEvent: history.events[0] ?? null
        };
      })
    );

    return NextResponse.json({ sites: sitesWithVerification });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to list product pages.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
