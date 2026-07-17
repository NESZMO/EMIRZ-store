"use server";

import crypto from "crypto";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/auth-session";
import { broadcast } from "@/lib/events";
import type { Category } from "@/lib/database.types";

export async function receiveStock(input: {
  supplier: string;
  invoice_no: string;
  product_id: string;
  product_name_snapshot: string;
  category: Category;
  qty: number;
  buy_price: number;
  delivery_date: string;
  notes: string;
}) {
  const session = await getSession();
  if (!session) throw new Error("Not signed in.");
  const db = getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const insertHistory = db.prepare(
    `insert into incoming_stock (id, store_id, supplier, invoice_no, product_id, product_name_snapshot, category, qty, buy_price, delivery_date, notes, created_at)
     values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const bumpQty = db.prepare("update products set qty = qty + ? where id = ?");

  const tx = db.transaction(() => {
    insertHistory.run(
      id,
      session.store.id,
      input.supplier,
      input.invoice_no,
      input.product_id,
      input.product_name_snapshot,
      input.category,
      input.qty,
      input.buy_price,
      input.delivery_date,
      input.notes,
      now,
    );
    bumpQty.run(input.qty, input.product_id);
  });
  tx();

  broadcast("incoming_stock");
  broadcast("products");
  return id;
}
