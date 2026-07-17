export type Category = "Crated" | "Boxed";
export type Role = "manager" | "cashier";
export type CrateStatus = "Outstanding" | "Cleared";
export type PaymentStatus = "Unpaid" | "Partial" | "Paid";
export type Language = "en" | "sw";

export interface StoreRow {
  id: string;
  name: string;
  phone: string;
  address: string;
  tax_rate_pct: number;
  currency_symbol: string;
  language: Language;
  notifications_enabled: boolean;
  crate_deposit_per_unit: number;
  created_at: string;
}

export interface ProfileRow {
  id: string;
  store_id: string;
  username: string;
  display_name: string;
  role: Role;
  created_at: string;
}

export interface ProductRow {
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
  created_at: string;
}

export interface IncomingStockRow {
  id: string;
  store_id: string;
  supplier: string;
  invoice_no: string;
  product_id: string | null;
  product_name_snapshot: string;
  category: Category;
  qty: number;
  buy_price: number;
  delivery_date: string;
  notes: string;
  created_at: string;
}

export interface SaleRow {
  id: string;
  store_id: string;
  customer_name: string;
  cashier_id: string | null;
  cashier_name_snapshot: string;
  subtotal: number;
  crate_charge: number;
  discount_pct: number;
  discount_amount: number;
  grand_total: number;
  amount_paid: number;
  balance: number;
  created_at: string;
}

export interface SaleItemRow {
  id: string;
  sale_id: string;
  product_id: string | null;
  name_snapshot: string;
  category_snapshot: Category;
  unit_price: number;
  buy_price_snapshot: number;
  qty: number;
  line_total: number;
}

export interface CrateRecordRow {
  id: string;
  store_id: string;
  customer: string;
  product_id: string | null;
  product_name_snapshot: string;
  taken: number;
  returned: number;
  status: CrateStatus;
  created_at: string;
}

export interface PendingPaymentRow {
  id: string;
  store_id: string;
  sale_id: string | null;
  customer: string;
  phone: string;
  products_text: string;
  total: number;
  paid: number;
  balance: number;
  due_date: string | null;
  status: PaymentStatus;
  created_at: string;
}

// NOTE: These Row interfaces describe the SQLite schema (lib/db.ts) and are
// used to type data read from the /api/* Route Handlers (cast at each call
// site, e.g. `data as ProductRow[]`).
