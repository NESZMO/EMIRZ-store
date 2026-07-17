import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireSession, isSession } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await requireSession();
  if (!isSession(session)) return session;

  const row = getDb().prepare("select * from stores where id = ?").get(session.store.id) as Record<string, unknown>;
  return NextResponse.json({ ...row, notifications_enabled: Boolean(row.notifications_enabled) });
}
