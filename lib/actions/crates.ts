"use server";

import crypto from "crypto";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/auth-session";
import { broadcast } from "@/lib/events";
import type { CrateStatus } from "@/lib/database.types";

async function requireUser() {
  const session = await getSession();
  if (!session) throw new Error("Not signed in.");
  return session;
}

export async function createCrateRecord(input: {
  customer: string;
  product_id: string | null;
  product_name_snapshot: string;
  taken: number;
  returned: number;
  status: CrateStatus;
}) {
  const { store } = await requireUser();
  const db = getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  db.prepare(
    `insert into crate_records (id, store_id, customer, product_id, product_name_snapshot, taken, returned, status, created_at)
     values (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(id, store.id, input.customer, input.product_id, input.product_name_snapshot, input.taken, input.returned, input.status, now);
  broadcast("crate_records");
  return id;
}

export async function updateCrateRecord(
  id: string,
  patch: Partial<{
    customer: string;
    product_id: string | null;
    product_name_snapshot: string;
    taken: number;
    returned: number;
    status: CrateStatus;
  }>,
) {
  await requireUser();
  const db = getDb();
  const fields = Object.keys(patch) as (keyof typeof patch)[];
  if (fields.length === 0) return;
  const setClause = fields.map((f) => `${f} = ?`).join(", ");
  db.prepare(`update crate_records set ${setClause} where id = ?`).run(...fields.map((f) => patch[f]), id);
  broadcast("crate_records");
}
