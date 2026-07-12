import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const secret = new TextEncoder().encode(
  process.env.SESSION_SECRET ?? "transitops-dev-secret-change-me"
);

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  // Public routes: login and the customer-facing tracking page
  if (pathname === "/login" || pathname.startsWith("/track/")) return NextResponse.next();

  const token = req.cookies.get("transitops_session")?.value;
  if (token) {
    try {
      await jwtVerify(token, secret);
      return NextResponse.next();
    } catch {
      // fall through to redirect
    }
  }
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/).*)"],
};
