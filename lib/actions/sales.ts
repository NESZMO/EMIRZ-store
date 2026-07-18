"use server";

import crypto from "crypto";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/auth-session";
import { broadcast } from "@/lib/events";
import type { Category, SaleItemRow, SaleRow } from "@/lib/database.types";

async function requireUser() {
  const session = await getSession();
  if (!session) throw new Error("Not signed in.");
  return session;
}

async function requireManager() {
  const session = await getSession();
  if (!session) throw new Error("Not signed in.");
  if (session.user.role !== "manager") throw new Error("Only a manager can do this.");
  return session;
}

export interface CartLineInput {
  productId: string;
  name: string;
  category: Category;
  unitPrice: number;
  buyPrice: number;
  qty: number;
  lineTotal: number;
}

export async function completeSale(input: {
  customerName: string;
  discountPct: number;
  amountPaid: number;
  crateUnits: number;
  cartLines: CartLineInput[];
}): Promise<SaleRow & { sale_items: SaleItemRow[] }> {
  const { user, store } = await requireUser();
  if (input.cartLines.length === 0) throw new Error("Cart is empty.");

  const db = getDb();
  const now = new Date().toISOString();
  const subtotal = input.cartLines.reduce((a, l) => a + l.lineTotal, 0);
  const discountAmount = (subtotal * (input.discountPct || 0)) / 100;
  const crateCharge = input.crateUnits * store.crate_deposit_per_unit;
  const grandTotal = subtotal - discountAmount + crateCharge;
  const balance = grandTotal - input.amountPaid;
  const customerName = input.customerName.trim() || "Walk-in Customer";
  const cashierName = user.display_name || user.username;

  const saleId = crypto.randomUUID();
  const insertSale = db.prepare(`
    insert into sales (id, store_id, customer_name, cashier_id, cashier_name_snapshot, subtotal, crate_charge, discount_pct, discount_amount, grand_total, amount_paid, balance, created_at)
    values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertItem = db.prepare(`
    insert into sale_items (id, sale_id, product_id, name_snapshot, category_snapshot, unit_price, buy_price_snapshot, qty, line_total)
    values (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const deductStock = db.prepare("update products set qty = max(0, qty - ?) where id = ?");
  const insertCrate = db.prepare(`
    insert into crate_records (id, store_id, sale_id, customer, product_id, product_name_snapshot, taken, returned, status, created_at)
    values (?, ?, ?, ?, ?, ?, ?, 0, 'Outstanding', ?)
  `);
  const insertPayment = db.prepare(`
    insert into pending_payments (id, store_id, sale_id, customer, phone, products_text, total, paid, balance, due_date, status, created_at)
    values (?, ?, ?, ?, '', ?, ?, ?, ?, ?, ?, ?)
  `);

  const items: SaleItemRow[] = [];

  const tx = db.transaction(() => {
    insertSale.run(saleId, store.id, customerName, user.id, cashierName, subtotal, crateCharge, input.discountPct || 0, discountAmount, grandTotal, input.amountPaid, balance, now);

    for (const line of input.cartLines) {
      const itemId = crypto.randomUUID();
      insertItem.run(itemId, saleId, line.productId, line.name, line.category, line.unitPrice, line.buyPrice, line.qty, line.lineTotal);
      items.push({
        id: itemId,
        sale_id: saleId,
        product_id: line.productId,
        name_snapshot: line.name,
        category_snapshot: line.category,
        unit_price: line.unitPrice,
        buy_price_snapshot: line.buyPrice,
        qty: line.qty,
        line_total: line.lineTotal,
      });
      deductStock.run(line.qty, line.productId);
    }

    if (input.crateUnits > 0) {
      const cratedLines = input.cartLines.filter((l) => l.category === "Crated");
      const productName = cratedLines.length > 1 ? "Mixed crates" : (cratedLines[0]?.name ?? "Crates");
      const productId = cratedLines.length === 1 ? cratedLines[0].productId : null;
      insertCrate.run(crypto.randomUUID(), store.id, saleId, customerName, productId, productName, input.crateUnits, now);
    }

    if (balance > 0) {
      const productsText = input.cartLines.map((l) => `${l.qty}× ${l.name}`).join(", ");
      const status = input.amountPaid > 0 ? "Partial" : "Unpaid";
      const dueDate = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
      insertPayment.run(crypto.randomUUID(), store.id, saleId, customerName, productsText, grandTotal, input.amountPaid, balance, dueDate, status, now);
    }
  });
  tx();

  broadcast("sales");
  broadcast("sale_items");
  broadcast("products");
  if (input.crateUnits > 0) broadcast("crate_records");
  if (balance > 0) broadcast("pending_payments");

  const sale = db.prepare("select * from sales where id = ?").get(saleId) as SaleRow;
  return { ...sale, sale_items: items };
}

export interface EditSaleItemInput {
  saleItemId: string;
  productId: string | null;
  name: string;
  unitPrice: number;
  category: Category;
  originalQty: number;
  newQty: number;
}

export async function editSale(input: {
  saleId: string;
  customerName: string;
  discountPct: number;
  paid: number;
  crateUnits: number;
  items: EditSaleItemInput[];
}) {
  const { store } = await requireUser();
  const db = getDb();

  const updateItem = db.prepare("update sale_items set qty = ?, line_total = ? where id = ?");
  const deleteItem = db.prepare("delete from sale_items where id = ?");
  const adjustStock = db.prepare("update products set qty = max(0, qty - ?) where id = ?");

  const activeItems = input.items.filter((i) => i.newQty > 0);
  const subtotal = activeItems.reduce((a, i) => a + i.unitPrice * i.newQty, 0);
  const discountAmount = (subtotal * (input.discountPct || 0)) / 100;
  const crateCharge = input.crateUnits * store.crate_deposit_per_unit;
  const grandTotal = subtotal - discountAmount + crateCharge;
  const balance = grandTotal - input.paid;
  const customerName = input.customerName.trim() || "Walk-in Customer";

  const tx = db.transaction(() => {
    for (const item of input.items) {
      const delta = item.newQty - item.originalQty;
      if (item.productId && delta !== 0) adjustStock.run(delta, item.productId);
      if (item.newQty <= 0) {
        deleteItem.run(item.saleItemId);
      } else {
        updateItem.run(item.newQty, item.newQty * item.unitPrice, item.saleItemId);
      }
    }

    db.prepare(
      `update sales set customer_name = ?, subtotal = ?, crate_charge = ?, discount_pct = ?, discount_amount = ?, grand_total = ?, amount_paid = ?, balance = ? where id = ?`,
    ).run(customerName, subtotal, crateCharge, input.discountPct || 0, discountAmount, grandTotal, input.paid, balance, input.saleId);

    const productsText = activeItems.map((i) => `${i.newQty}× ${i.name}`).join(", ");
    const existing = db.prepare("select id from pending_payments where sale_id = ?").get(input.saleId) as { id: string } | undefined;

    if (balance > 0) {
      const status = input.paid > 0 ? "Partial" : "Unpaid";
      if (existing) {
        db.prepare("update pending_payments set customer = ?, products_text = ?, total = ?, paid = ?, balance = ?, status = ? where id = ?").run(
          customerName,
          productsText,
          grandTotal,
          input.paid,
          balance,
          status,
          existing.id,
        );
      } else {
        const dueDate = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
        db.prepare(
          `insert into pending_payments (id, store_id, sale_id, customer, phone, products_text, total, paid, balance, due_date, status, created_at)
           values (?, ?, ?, ?, '', ?, ?, ?, ?, ?, ?, ?)`,
        ).run(crypto.randomUUID(), store.id, input.saleId, customerName, productsText, grandTotal, input.paid, balance, dueDate, status, new Date().toISOString());
      }
    } else if (existing) {
      db.prepare("update pending_payments set paid = ?, balance = 0, status = 'Paid' where id = ?").run(grandTotal, existing.id);
    }
  });
  tx();

  broadcast("sales");
  broadcast("sale_items");
  broadcast("products");
  broadcast("pending_payments");
}

/**
 * Cancels a completed sale: restores stock for every line item, removes any
 * pending-payment and crate record it created, then deletes the sale itself
 * (sale_items cascade with it). Manager-only — this reverses real inventory
 * and money-owed state, not just a display row.
 */
export async function deleteSale(saleId: string) {
  await requireManager();
  const db = getDb();

  const items = db.prepare("select product_id, qty from sale_items where sale_id = ?").all(saleId) as {
    product_id: string | null;
    qty: number;
  }[];
  const restoreStock = db.prepare("update products set qty = qty + ? where id = ?");

  const tx = db.transaction(() => {
    for (const item of items) {
      if (item.product_id) restoreStock.run(item.qty, item.product_id);
    }
    db.prepare("delete from pending_payments where sale_id = ?").run(saleId);
    db.prepare("delete from crate_records where sale_id = ?").run(saleId);
    db.prepare("delete from sales where id = ?").run(saleId);
  });
  tx();

  broadcast("sales");
  broadcast("sale_items");
  broadcast("products");
  broadcast("pending_payments");
  broadcast("crate_records");
}
