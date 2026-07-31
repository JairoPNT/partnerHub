import { NextRequest, NextResponse } from "next/server";

const PUBLIC_HOST = "oferta.partnerhub.club";
const ADMIN_HOST = "app.partnerhub.club";

// Rutas permitidas públicamente en oferta.partnerhub.club
function isPublicOfferRoute(pathname: string): boolean {
  if (pathname === "/" || pathname === "" || pathname === "/oferta-beta") {
    return true;
  }
  if (pathname.startsWith("/onboarding") || pathname.startsWith("/api/public")) {
    return true;
  }
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname === "/favicon.ico" ||
    /\.(?:svg|webp|png|jpg|jpeg|css|js|ttf|woff2?)$/i.test(pathname)
  ) {
    return true;
  }
  return false;
}

export function proxy(request: NextRequest) {
  const rawHost = request.headers.get("x-forwarded-host") || request.headers.get("host") || "";
  const hostname = rawHost.split(":")[0].toLowerCase();
  const pathname = request.nextUrl.pathname;

  // 1. REGLAS PARA EL DOMINIO PÚBLICO (oferta.partnerhub.club)
  if (hostname === PUBLIC_HOST) {
    // Reescribir la raíz a /oferta-beta
    if (pathname === "/" || pathname === "") {
      const url = request.nextUrl.clone();
      url.pathname = "/oferta-beta";
      return NextResponse.rewrite(url);
    }

    // Bloquear llamadas a APIs internas desde el dominio público
    if (pathname.startsWith("/api/internal")) {
      return NextResponse.json(
        { error: "Acceso denegado. Las APIs internas solo están permitidas desde el dominio de administración." },
        { status: 403 }
      );
    }

    // BLINDAJE: Si se intenta acceder a cualquier ruta no pública desde oferta.partnerhub.club (ej. /dashboard, /partners, etc.)
    if (!isPublicOfferRoute(pathname)) {
      return NextResponse.redirect(new URL(`https://${PUBLIC_HOST}/`), 307);
    }

    return NextResponse.next();
  }

  // 2. REGLAS PARA EL DOMINIO DE ADMINISTRACIÓN (app.partnerhub.club)
  if (hostname === ADMIN_HOST) {
    // Redirigir la oferta beta al dominio público de oferta
    if (pathname === "/oferta-beta") {
      return NextResponse.redirect(new URL(`https://${PUBLIC_HOST}/`), 308);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)"
  ]
};
