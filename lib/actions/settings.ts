"use server";

import crypto from "crypto";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/auth-session";
import { broadcast } from "@/lib/events";
import type {
  CrateRecordRow,
  IncomingStockRow,
  Language,
  PendingPaymentRow,
  ProductRow,
} from "@/lib/database.types";

async function requireManager() {
  const session = await getSession();
  if (!session) throw new Error("Not signed in.");
  if (session.user.role !== "manager") throw new Error("Only a manager can do this.");
  return session;
}

async function requireUser() {
  const session = await getSession();
  if (!session) throw new Error("Not signed in.");
  return session;
}

export async function updateStoreInfo(patch: { name: string; phone: string; address: string; tax_rate_pct: number }) {
  const { store } = await requireManager();
  getDb()
    .prepare("update stores set name = ?, phone = ?, address = ?, tax_rate_pct = ? where id = ?")
    .run(patch.name, patch.phone, patch.address, patch.tax_rate_pct, store.id);
  broadcast("stores");
}

export async function setLanguage(lang: Language) {
  const { store } = await requireUser();
  getDb().prepare("update stores set language = ? where id = ?").run(lang, store.id);
  broadcast("stores");
}

export async function toggleNotifications(enabled: boolean) {
  const { store } = await requireUser();
  getDb().prepare("update stores set notifications_enabled = ? where id = ?").run(enabled ? 1 : 0, store.id);
  broadcast("stores");
}

interface BackupPayload {
  products?: ProductRow[];
  crateRecords?: CrateRecordRow[];
  incomingHistory?: IncomingStockRow[];
  pendingPayments?: PendingPaymentRow[];
}

export async function restoreBackup(data: BackupPayload) {
  const { store } = await requireManager();
  const db = getDb();
  const now = new Date().toISOString();

  const upsertProduct = db.prepare(`
    insert into products (id, store_id, name, brand, category, supplier, buy_price, sell_price, qty, min_stock, date_added, created_at)
    values (@id, @store_id, @name, @brand, @category, @supplier, @buy_price, @sell_price, @qty, @min_stock, @date_added, @created_at)
    on conflict(id) do update set name=excluded.name, brand=excluded.brand, category=excluded.category, supplier=excluded.supplier,
      buy_price=excluded.buy_price, sell_price=excluded.sell_price, qty=excluded.qty, min_stock=excluded.min_stock, date_added=excluded.date_added
  `);
  const upsertCrate = db.prepare(`
    insert into crate_records (id, store_id, customer, product_id, product_name_snapshot, taken, returned, status, created_at)
    values (@id, @store_id, @customer, @product_id, @product_name_snapshot, @taken, @returned, @status, @created_at)
    on conflict(id) do update set customer=excluded.customer, product_id=excluded.product_id, product_name_snapshot=excluded.product_name_snapshot,
      taken=excluded.taken, returned=excluded.returned, status=excluded.status
  `);
  const upsertIncoming = db.prepare(`
    insert into incoming_stock (id, store_id, supplier, invoice_no, product_id, product_name_snapshot, category, qty, buy_price, delivery_date, notes, created_at)
    values (@id, @store_id, @supplier, @invoice_no, @product_id, @product_name_snapshot, @category, @qty, @buy_price, @delivery_date, @notes, @created_at)
    on conflict(id) do update set supplier=excluded.supplier, invoice_no=excluded.invoice_no, product_id=excluded.product_id,
      product_name_snapshot=excluded.product_name_snapshot, category=excluded.category, qty=excluded.qty, buy_price=excluded.buy_price,
      delivery_date=excluded.delivery_date, notes=excluded.notes
  `);
  const upsertPayment = db.prepare(`
    insert into pending_payments (id, store_id, sale_id, customer, phone, products_text, total, paid, balance, due_date, status, created_at)
    values (@id, @store_id, @sale_id, @customer, @phone, @products_text, @total, @paid, @balance, @due_date, @status, @created_at)
    on conflict(id) do update set customer=excluded.customer, phone=excluded.phone, products_text=excluded.products_text,
      total=excluded.total, paid=excluded.paid, balance=excluded.balance, due_date=excluded.due_date, status=excluded.status
  `);

  const tx = db.transaction(() => {
    for (const p of data.products ?? []) {
      upsertProduct.run({ ...p, id: p.id ?? crypto.randomUUID(), store_id: store.id, created_at: p.created_at ?? now });
    }
    for (const c of data.crateRecords ?? []) {
      upsertCrate.run({ ...c, id: c.id ?? crypto.randomUUID(), store_id: store.id, product_id: c.product_id ?? null, created_at: c.created_at ?? now });
    }
    for (const h of data.incomingHistory ?? []) {
      upsertIncoming.run({ ...h, id: h.id ?? crypto.randomUUID(), store_id: store.id, product_id: h.product_id ?? null, created_at: h.created_at ?? now });
    }
    for (const pay of data.pendingPayments ?? []) {
      upsertPayment.run({ ...pay, id: pay.id ?? crypto.randomUUID(), store_id: store.id, sale_id: pay.sale_id ?? null, due_date: pay.due_date ?? null, created_at: pay.created_at ?? now });
    }
  });
  tx();

  broadcast("products");
  broadcast("crate_records");
  broadcast("incoming_stock");
  broadcast("pending_payments");
}
