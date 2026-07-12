import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

// Fail fast rather than fall back to a guessable default: a known secret
// would let anyone forge a session token for any role.
if (!process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET is not set. Add it to .env before starting the app.");
}
const secret = new TextEncoder().encode(process.env.SESSION_SECRET);

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
