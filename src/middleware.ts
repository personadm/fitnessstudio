import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(
  process.env.TOKEN_SECRET || "dev-secret-please-change-in-production",
);

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Login selbst ist immer erreichbar
  if (pathname === "/admin/login") return NextResponse.next();

  const token = req.cookies.get("admin_session")?.value;
  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin/login";
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  try {
    await jwtVerify(token, SECRET);
    return NextResponse.next();
  } catch {
    const url = req.nextUrl.clone();
    url.pathname = "/admin/login";
    return NextResponse.redirect(url);
  }
}

export const config = {
  matcher: ["/admin/:path*"],
};
