import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import path from "path";
import fs from "fs";
import crypto from "crypto";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "store.db");
const STORE_ID = "store-1";
const DEFAULT_USERNAME = "manager";
const DEFAULT_PASSWORD = "emirz123";

declare global {
  var __emirzDb: Database.Database | undefined;
}

function openDb(): Database.Database {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  return db;
}

function migrate(db: Database.Database) {
  db.exec(`
    create table if not exists stores (
      id text primary key,
      name text not null default 'EMIRZ stoRe',
      phone text not null default '',
      address text not null default '',
      tax_rate_pct real not null default 18,
      currency_symbol text not null default 'TSh',
      language text not null default 'en',
      notifications_enabled integer not null default 1,
      crate_deposit_per_unit real not null default 500,
      created_at text not null
    );

    create table if not exists users (
      id text primary key,
      store_id text not null references stores(id),
      username text not null unique,
      password_hash text not null,
      display_name text not null default '',
      role text not null default 'cashier',
      created_at text not null
    );

    create table if not exists products (
      id text primary key,
      store_id text not null references stores(id),
      name text not null,
      brand text not null default '',
      category text not null,
      supplier text not null default '',
      buy_price real not null default 0,
      sell_price real not null default 0,
      qty integer not null default 0,
      min_stock integer not null default 0,
      date_added text not null,
      created_at text not null
    );

    create table if not exists incoming_stock (
      id text primary key,
      store_id text not null references stores(id),
      supplier text not null default '',
      invoice_no text not null default '',
      product_id text references products(id),
      product_name_snapshot text not null default '',
      category text not null default 'Crated',
      qty integer not null default 0,
      buy_price real not null default 0,
      delivery_date text not null,
      notes text not null default '',
      created_at text not null
    );

    create table if not exists sales (
      id text primary key,
      store_id text not null references stores(id),
      customer_name text not null default '',
      cashier_id text references users(id),
      cashier_name_snapshot text not null default '',
      subtotal real not null default 0,
      crate_charge real not null default 0,
      discount_pct real not null default 0,
      discount_amount real not null default 0,
      grand_total real not null default 0,
      amount_paid real not null default 0,
      balance real not null default 0,
      created_at text not null
    );

    create table if not exists sale_items (
      id text primary key,
      sale_id text not null references sales(id) on delete cascade,
      product_id text references products(id),
      name_snapshot text not null,
      category_snapshot text not null,
      unit_price real not null default 0,
      buy_price_snapshot real not null default 0,
      qty integer not null default 1,
      line_total real not null default 0
    );

    create table if not exists crate_records (
      id text primary key,
      store_id text not null references stores(id),
      sale_id text references sales(id),
      customer text not null,
      product_id text references products(id),
      product_name_snapshot text not null default '',
      taken integer not null default 0,
      returned integer not null default 0,
      status text not null default 'Outstanding',
      created_at text not null
    );

    create table if not exists pending_payments (
      id text primary key,
      store_id text not null references stores(id),
      sale_id text references sales(id),
      customer text not null,
      phone text not null default '',
      products_text text not null default '',
      total real not null default 0,
      paid real not null default 0,
      balance real not null default 0,
      due_date text,
      status text not null default 'Unpaid',
      created_at text not null
    );

    create index if not exists idx_products_store on products(store_id);
    create index if not exists idx_incoming_store on incoming_stock(store_id);
    create index if not exists idx_sales_store on sales(store_id);
    create index if not exists idx_sale_items_sale on sale_items(sale_id);
    create index if not exists idx_crates_store on crate_records(store_id);
    create index if not exists idx_crates_sale on crate_records(sale_id);
    create index if not exists idx_payments_store on pending_payments(store_id);
    create index if not exists idx_payments_sale on pending_payments(sale_id);
  `);

  // Installs created before crate_records had a sale_id column need it added
  // in place — "create table if not exists" above only affects brand-new DBs.
  const crateColumns = db.prepare("pragma table_info(crate_records)").all() as { name: string }[];
  if (!crateColumns.some((c) => c.name === "sale_id")) {
    db.exec("alter table crate_records add column sale_id text references sales(id)");
  }
}

function seed(db: Database.Database) {
  const now = new Date().toISOString();
  const hasStore = db.prepare("select 1 from stores where id = ?").get(STORE_ID);
  if (!hasStore) {
    db.prepare(
      `insert into stores (id, name, phone, address, tax_rate_pct, currency_symbol, language, notifications_enabled, crate_deposit_per_unit, created_at)
       values (?, 'EMIRZ stoRe', '+255 700 000 000', 'Kariakoo, Dar es Salaam', 18, 'TSh', 'en', 1, 500, ?)`,
    ).run(STORE_ID, now);
  }

  const hasManager = db.prepare("select 1 from users where username = ?").get(DEFAULT_USERNAME);
  if (!hasManager) {
    const hash = bcrypt.hashSync(DEFAULT_PASSWORD, 10);
    db.prepare(
      `insert into users (id, store_id, username, password_hash, display_name, role, created_at)
       values (?, ?, ?, ?, 'Manager', 'manager', ?)`,
    ).run(crypto.randomUUID(), STORE_ID, DEFAULT_USERNAME, hash, now);
  }

  const productCount = (db.prepare("select count(*) as c from products where store_id = ?").get(STORE_ID) as { c: number }).c;
  if (productCount === 0) {
    const insertProduct = db.prepare(
      `insert into products (id, store_id, name, brand, category, supplier, buy_price, sell_price, qty, min_stock, date_added, created_at)
       values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    const starterProducts: [string, string, string, string, number, number, number, number, string][] = [
      ["Coca-Cola 35cl Crate", "Coca-Cola", "Crated", "Metro Bottlers Ltd", 2800, 3200, 45, 20, "2026-06-01"],
      ["Fanta Orange 35cl Crate", "Fanta", "Crated", "Metro Bottlers Ltd", 2700, 3100, 38, 20, "2026-06-01"],
      ["Sprite 35cl Crate", "Sprite", "Crated", "Metro Bottlers Ltd", 2700, 3100, 12, 20, "2026-06-03"],
      ["Star Lager Beer Crate", "Star", "Crated", "Golden Hops Distillers", 6200, 7000, 25, 15, "2026-06-05"],
      ["Guinness Malt Crate", "Guinness", "Crated", "Golden Hops Distillers", 6500, 7300, 30, 15, "2026-06-05"],
      ["Soda Water Crate", "Schweppes", "Crated", "Metro Bottlers Ltd", 2500, 2900, 18, 15, "2026-06-08"],
      ["Coca-Cola Can Box (24)", "Coca-Cola", "Boxed", "Metro Bottlers Ltd", 3600, 4200, 40, 15, "2026-06-02"],
      ["Sprite Can Box (24)", "Sprite", "Boxed", "Metro Bottlers Ltd", 3500, 4100, 10, 15, "2026-06-02"],
      ["Bullet Energy Drink Box (24)", "Bullet", "Boxed", "PowerUp Distributors", 5200, 6000, 22, 10, "2026-06-06"],
      ["Malt Can Box (24)", "Amstel Malta", "Boxed", "Golden Hops Distillers", 5000, 5800, 28, 10, "2026-06-06"],
    ];
    const productIds: Record<string, string> = {};
    for (const [name, brand, category, supplier, buyPrice, sellPrice, qty, minStock, dateAdded] of starterProducts) {
      const id = crypto.randomUUID();
      productIds[name] = id;
      insertProduct.run(id, STORE_ID, name, brand, category, supplier, buyPrice, sellPrice, qty, minStock, dateAdded, now);
    }

    const insertCrate = db.prepare(
      `insert into crate_records (id, store_id, customer, product_id, product_name_snapshot, taken, returned, status, created_at)
       values (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    const starterCrates: [string, string, number, number][] = [
      ["Chidi's Bar", "Star Lager Beer Crate", 20, 12],
      ["Joy Supermarket", "Coca-Cola 35cl Crate", 15, 15],
      ["Fatima Stores", "Guinness Malt Crate", 10, 4],
    ];
    for (const [customer, productName, taken, returned] of starterCrates) {
      const status = Math.max(0, taken - returned) === 0 ? "Cleared" : "Outstanding";
      insertCrate.run(crypto.randomUUID(), STORE_ID, customer, productIds[productName] ?? null, productName, taken, returned, status, now);
    }
  }
}

export function getDb(): Database.Database {
  if (!global.__emirzDb) {
    const db = openDb();
    migrate(db);
    seed(db);
    global.__emirzDb = db;
  }
  return global.__emirzDb;
}

export const DEFAULT_STORE_ID = STORE_ID;
