import { NextResponse } from "next/server";
import { getSession, type SessionStore, type SessionUser } from "@/lib/auth-session";

export async function requireSession(): Promise<
  { user: SessionUser; store: SessionStore } | NextResponse
> {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return session;
}

export function isSession(
  value: { user: SessionUser; store: SessionStore } | NextResponse,
): value is { user: SessionUser; store: SessionStore } {
  return !(value instanceof NextResponse);
}
