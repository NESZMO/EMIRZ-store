"use server";

import crypto from "crypto";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/auth-session";
import { broadcast } from "@/lib/events";
import type { Category } from "@/lib/database.types";

async function requireUser() {
  const session = await getSession();
  if (!session) throw new Error("Not signed in.");
  return session;
}

export async function createProduct(input: {
  name: string;
  brand: string;
  category: Category;
  supplier: string;
  buy_price: number;
  sell_price: number;
  qty: number;
  min_stock: number;
  date_added: string;
}) {
  const { store } = await requireUser();
  const db = getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  db.prepare(
    `insert into products (id, store_id, name, brand, category, supplier, buy_price, sell_price, qty, min_stock, date_added, created_at)
     values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(id, store.id, input.name, input.brand, input.category, input.supplier, input.buy_price, input.sell_price, input.qty, input.min_stock, input.date_added, now);
  broadcast("products");
  return id;
}

export async function updateProduct(
  id: string,
  patch: Partial<{
    name: string;
    brand: string;
    category: Category;
    supplier: string;
    buy_price: number;
    sell_price: number;
    qty: number;
    min_stock: number;
  }>,
) {
  await requireUser();
  const db = getDb();
  const fields = Object.keys(patch) as (keyof typeof patch)[];
  if (fields.length === 0) return;
  const setClause = fields.map((f) => `${f} = ?`).join(", ");
  db.prepare(`update products set ${setClause} where id = ?`).run(...fields.map((f) => patch[f]), id);
  broadcast("products");
}

export async function deleteProduct(id: string) {
  await requireUser();
  getDb().prepare("delete from products where id = ?").run(id);
  broadcast("products");
}

/** Used by EditSaleModal/undo to restore a deleted product with its original id. */
export async function recreateProduct(row: {
  id: string;
  store_id: string;
  name: string;
  brand: string;
  category: Category;
  supplier: string;
  buy_price: number;
  sell_price: number;
  qty: number;
  min_stock: number;
  date_added: string;
}) {
  await requireUser();
  const db = getDb();
  const now = new Date().toISOString();
  db.prepare(
    `insert into products (id, store_id, name, brand, category, supplier, buy_price, sell_price, qty, min_stock, date_added, created_at)
     values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(row.id, row.store_id, row.name, row.brand, row.category, row.supplier, row.buy_price, row.sell_price, row.qty, row.min_stock, row.date_added, now);
  broadcast("products");
}
