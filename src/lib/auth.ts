import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";

const secret = new TextEncoder().encode(
  process.env.SESSION_SECRET ?? "transitops-dev-secret-change-me"
);

export type Session = {
  userId: string;
  email: string;
  name: string;
  role: Role;
};

const COOKIE = "transitops_session";

export async function createSession(session: Session) {
  const token = await new SignJWT(session)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("12h")
    .sign(secret);
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 12 * 3600,
  });
}

export async function destroySession() {
  (await cookies()).delete(COOKIE);
}

export async function getSession(): Promise<Session | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as Session;
  } catch {
    return null;
  }
}

export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

// RBAC: which roles may perform write actions in each module.
// All authenticated roles get read access everywhere.
const WRITE_ACCESS: Record<string, Role[]> = {
  vehicles: ["FLEET_MANAGER"],
  drivers: ["FLEET_MANAGER", "SAFETY_OFFICER"],
  trips: ["FLEET_MANAGER", "DRIVER"],
  maintenance: ["FLEET_MANAGER"],
  finance: ["FLEET_MANAGER", "FINANCIAL_ANALYST"],
};

export function canWrite(role: Role, module: keyof typeof WRITE_ACCESS): boolean {
  return WRITE_ACCESS[module]?.includes(role) ?? false;
}

export async function requireWrite(module: keyof typeof WRITE_ACCESS): Promise<Session> {
  const session = await requireSession();
  if (!canWrite(session.role, module)) {
    throw new Error("You do not have permission to perform this action.");
  }
  return session;
}
