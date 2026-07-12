import { NextResponse } from "next/server";
import { getSession, canWrite, type Session } from "@/lib/auth";

export function apiError(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

export async function requireApiSession(): Promise<Session | NextResponse> {
  const session = await getSession();
  if (!session) return apiError(401, "Authentication required. Sign in to obtain a session cookie.");
  return session;
}

export async function requireApiWrite(
  module: Parameters<typeof canWrite>[1]
): Promise<Session | NextResponse> {
  const session = await requireApiSession();
  if (session instanceof NextResponse) return session;
  if (!canWrite(session.role, module)) {
    return apiError(403, `Role ${session.role} does not have write access to ${module}.`);
  }
  return session;
}

// Pagination: ?page=1&limit=20 (limit capped at 100)
export function parsePagination(url: URL) {
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit")) || 20));
  return { skip: (page - 1) * limit, take: limit, page, limit };
}

export function isEnum<T extends string>(value: string | null, allowed: readonly T[]): value is T {
  return value !== null && (allowed as readonly string[]).includes(value);
}

export function num(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}
