import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireSession, isSession } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await requireSession();
  if (!isSession(session)) return session;

  const rows = getDb()
    .prepare("select * from products where store_id = ? order by date_added desc, created_at desc")
    .all(session.store.id);
  return NextResponse.json(rows);
}
