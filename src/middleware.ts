import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const SECRET_STRING = process.env.TOKEN_SECRET;
if (!SECRET_STRING && process.env.NODE_ENV === "production") {
  throw new Error("TOKEN_SECRET ist nicht gesetzt.");
}
const SECRET = new TextEncoder().encode(
  SECRET_STRING || "dev-secret-please-change-in-production",
);

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isApi = pathname.startsWith("/api/");
  const isPlatform = pathname.startsWith("/platform") || pathname.startsWith("/api/platform");

  // Login-Seiten/-Endpunkte sind immer erreichbar.
  if (pathname === "/admin/login") return NextResponse.next();
  if (pathname === "/platform/login" || pathname === "/api/platform/login") {
    return NextResponse.next();
  }

  // Studio-Admin nutzt admin_session + /admin/login,
  // Platform-Betreiber nutzt platform_session + /platform/login.
  const cookieName = isPlatform ? "platform_session" : "admin_session";
  const loginPath = isPlatform ? "/platform/login" : "/admin/login";

  const unauthorized = () => {
    if (isApi) {
      return NextResponse.json({ ok: false, message: "Nicht autorisiert." }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = loginPath;
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  };

  const token = req.cookies.get(cookieName)?.value;
  if (!token) return unauthorized();

  try {
    await jwtVerify(token, SECRET);
    return NextResponse.next();
  } catch {
    return unauthorized();
  }
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*", "/platform/:path*", "/api/platform/:path*"],
};
