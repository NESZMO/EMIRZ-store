import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireSession, isSession } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await requireSession();
  if (!isSession(session)) return session;

  const rows = getDb()
    .prepare("select id, store_id, username, display_name, role, created_at from users where store_id = ? order by created_at asc")
    .all(session.store.id);
  return NextResponse.json(rows);
}
