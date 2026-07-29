import { NextRequest, NextResponse } from "next/server";

const PUBLIC_HOST = "oferta.partnerhub.club";
const ADMIN_HOST = "app.partnerhub.club";

export function proxy(request: NextRequest) {
  const hostname = request.headers.get("host")?.split(":")[0].toLowerCase();
  const pathname = request.nextUrl.pathname;

  if (hostname === PUBLIC_HOST && (pathname === "/" || pathname === "")) {
    const url = request.nextUrl.clone();
    url.pathname = "/oferta-beta";
    return NextResponse.rewrite(url);
  }

  if (hostname === ADMIN_HOST && pathname === "/oferta-beta") {
    return NextResponse.redirect(new URL(`https://${PUBLIC_HOST}/`), 308);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/oferta-beta"]
};
