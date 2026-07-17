import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireSession, isSession } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await requireSession();
  if (!isSession(session)) return session;

  const db = getDb();
  const sales = db
    .prepare("select * from sales where store_id = ? order by created_at desc")
    .all(session.store.id) as { id: string }[];

  if (sales.length === 0) return NextResponse.json([]);

  const placeholders = sales.map(() => "?").join(",");
  const items = db
    .prepare(`select * from sale_items where sale_id in (${placeholders})`)
    .all(...sales.map((s) => s.id)) as { sale_id: string }[];

  const itemsBySale = new Map<string, typeof items>();
  for (const item of items) {
    const list = itemsBySale.get(item.sale_id) ?? [];
    list.push(item);
    itemsBySale.set(item.sale_id, list);
  }

  const result = sales.map((s) => ({ ...s, sale_items: itemsBySale.get(s.id) ?? [] }));
  return NextResponse.json(result);
}
