"use server";

import crypto from "crypto";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/auth-session";
import { broadcast } from "@/lib/events";
import type { PaymentStatus } from "@/lib/database.types";

async function requireUser() {
  const session = await getSession();
  if (!session) throw new Error("Not signed in.");
  return session;
}

export async function createPayment(input: {
  customer: string;
  phone: string;
  products_text: string;
  total: number;
  paid: number;
  balance: number;
  status: PaymentStatus;
  due_date: string | null;
}) {
  const { store } = await requireUser();
  const db = getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  db.prepare(
    `insert into pending_payments (id, store_id, sale_id, customer, phone, products_text, total, paid, balance, due_date, status, created_at)
     values (?, ?, null, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(id, store.id, input.customer, input.phone, input.products_text, input.total, input.paid, input.balance, input.due_date, input.status, now);
  broadcast("pending_payments");
  return id;
}

export async function updatePayment(
  id: string,
  patch: Partial<{ paid: number; balance: number; status: PaymentStatus }>,
) {
  await requireUser();
  const db = getDb();
  const fields = Object.keys(patch) as (keyof typeof patch)[];
  if (fields.length === 0) return;
  const setClause = fields.map((f) => `${f} = ?`).join(", ");
  db.prepare(`update pending_payments set ${setClause} where id = ?`).run(...fields.map((f) => patch[f]), id);
  broadcast("pending_payments");
}
