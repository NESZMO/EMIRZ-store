-- EMIRZ stoRe — initial schema, RLS policies, and seed data
-- Run this once in the Supabase SQL editor for a fresh project.

-- ============================================================
-- Extensions
-- ============================================================
create extension if not exists pgcrypto;

-- ============================================================
-- Tables
-- ============================================================

create table public.stores (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'EMIRZ stoRe',
  phone text not null default '',
  address text not null default '',
  tax_rate_pct numeric not null default 18,
  currency_symbol text not null default 'TSh',
  language text not null default 'en' check (language in ('en', 'sw')),
  notifications_enabled boolean not null default true,
  crate_deposit_per_unit numeric not null default 500,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  store_id uuid not null references public.stores (id) on delete cascade,
  username text not null unique,
  display_name text not null default '',
  role text not null default 'cashier' check (role in ('manager', 'cashier')),
  created_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  name text not null,
  brand text not null default '',
  category text not null check (category in ('Crated', 'Boxed')),
  supplier text not null default '',
  buy_price numeric not null default 0,
  sell_price numeric not null default 0,
  qty integer not null default 0,
  min_stock integer not null default 0,
  date_added date not null default current_date,
  created_at timestamptz not null default now()
);

create table public.incoming_stock (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  supplier text not null default '',
  invoice_no text not null default '',
  product_id uuid references public.products (id) on delete set null,
  product_name_snapshot text not null default '',
  category text not null default 'Crated' check (category in ('Crated', 'Boxed')),
  qty integer not null default 0,
  buy_price numeric not null default 0,
  delivery_date date not null default current_date,
  notes text not null default '',
  created_at timestamptz not null default now()
);

create table public.sales (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  customer_name text not null default '',
  cashier_id uuid references public.profiles (id) on delete set null,
  cashier_name_snapshot text not null default '',
  subtotal numeric not null default 0,
  crate_charge numeric not null default 0,
  discount_pct numeric not null default 0,
  discount_amount numeric not null default 0,
  grand_total numeric not null default 0,
  amount_paid numeric not null default 0,
  balance numeric not null default 0,
  created_at timestamptz not null default now()
);

create table public.sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  name_snapshot text not null,
  category_snapshot text not null,
  unit_price numeric not null default 0,
  buy_price_snapshot numeric not null default 0,
  qty integer not null default 1,
  line_total numeric not null default 0
);

create table public.crate_records (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  customer text not null,
  product_id uuid references public.products (id) on delete set null,
  product_name_snapshot text not null default '',
  taken integer not null default 0,
  returned integer not null default 0,
  status text not null default 'Outstanding' check (status in ('Outstanding', 'Cleared')),
  created_at timestamptz not null default now()
);

create table public.pending_payments (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  customer text not null,
  phone text not null default '',
  products_text text not null default '',
  total numeric not null default 0,
  paid numeric not null default 0,
  balance numeric not null default 0,
  due_date date,
  status text not null default 'Unpaid' check (status in ('Unpaid', 'Partial', 'Paid')),
  created_at timestamptz not null default now()
);

create index on public.products (store_id);
create index on public.incoming_stock (store_id);
create index on public.sales (store_id);
create index on public.sale_items (sale_id);
create index on public.crate_records (store_id);
create index on public.pending_payments (store_id);

-- ============================================================
-- Helper functions (security definer to avoid RLS recursion)
-- ============================================================

create function public.current_store_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select store_id from public.profiles where id = auth.uid();
$$;

create function public.current_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- ============================================================
-- RLS
-- ============================================================

alter table public.stores enable row level security;
alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.incoming_stock enable row level security;
alter table public.sales enable row level security;
alter table public.sale_items enable row level security;
alter table public.crate_records enable row level security;
alter table public.pending_payments enable row level security;

-- stores: any authenticated member of the store can read; only a manager can update.
create policy "stores_select" on public.stores for select
  using (id = public.current_store_id());
create policy "stores_update" on public.stores for update
  using (id = public.current_store_id() and public.current_role() = 'manager');

-- profiles: members can see co-workers in the same store; a manager can manage them.
create policy "profiles_select" on public.profiles for select
  using (store_id = public.current_store_id());
create policy "profiles_insert" on public.profiles for insert
  with check (store_id = public.current_store_id() and public.current_role() = 'manager');
create policy "profiles_update_self" on public.profiles for update
  using (id = auth.uid() or public.current_role() = 'manager');

-- products: all members read/insert/update; only managers delete.
create policy "products_select" on public.products for select
  using (store_id = public.current_store_id());
create policy "products_insert" on public.products for insert
  with check (store_id = public.current_store_id());
create policy "products_update" on public.products for update
  using (store_id = public.current_store_id());
create policy "products_delete" on public.products for delete
  using (store_id = public.current_store_id() and public.current_role() = 'manager');

-- incoming_stock: all members read/insert; only managers delete.
create policy "incoming_select" on public.incoming_stock for select
  using (store_id = public.current_store_id());
create policy "incoming_insert" on public.incoming_stock for insert
  with check (store_id = public.current_store_id());
create policy "incoming_delete" on public.incoming_stock for delete
  using (store_id = public.current_store_id() and public.current_role() = 'manager');

-- sales & sale_items: all members read/insert; only managers delete/update (edit sale).
create policy "sales_select" on public.sales for select
  using (store_id = public.current_store_id());
create policy "sales_insert" on public.sales for insert
  with check (store_id = public.current_store_id());
create policy "sales_update" on public.sales for update
  using (store_id = public.current_store_id());
create policy "sales_delete" on public.sales for delete
  using (store_id = public.current_store_id() and public.current_role() = 'manager');

create policy "sale_items_select" on public.sale_items for select
  using (sale_id in (select id from public.sales where store_id = public.current_store_id()));
create policy "sale_items_insert" on public.sale_items for insert
  with check (sale_id in (select id from public.sales where store_id = public.current_store_id()));
create policy "sale_items_update" on public.sale_items for update
  using (sale_id in (select id from public.sales where store_id = public.current_store_id()));
create policy "sale_items_delete" on public.sale_items for delete
  using (sale_id in (select id from public.sales where store_id = public.current_store_id()));

-- crate_records: all members read/insert/update; only managers delete.
create policy "crates_select" on public.crate_records for select
  using (store_id = public.current_store_id());
create policy "crates_insert" on public.crate_records for insert
  with check (store_id = public.current_store_id());
create policy "crates_update" on public.crate_records for update
  using (store_id = public.current_store_id());
create policy "crates_delete" on public.crate_records for delete
  using (store_id = public.current_store_id() and public.current_role() = 'manager');

-- pending_payments: all members read/insert/update; only managers delete.
create policy "payments_select" on public.pending_payments for select
  using (store_id = public.current_store_id());
create policy "payments_insert" on public.pending_payments for insert
  with check (store_id = public.current_store_id());
create policy "payments_update" on public.pending_payments for update
  using (store_id = public.current_store_id());
create policy "payments_delete" on public.pending_payments for delete
  using (store_id = public.current_store_id() and public.current_role() = 'manager');

-- ============================================================
-- Seed: one store + starter product/crate data
-- (Run supabase/migrations/0002_bootstrap_manager.sql AFTER creating your
--  first Supabase Auth user — it needs that user's id.)
-- ============================================================

insert into public.stores (id, name, phone, address, tax_rate_pct, currency_symbol, language, crate_deposit_per_unit)
values ('00000000-0000-0000-0000-000000000001', 'EMIRZ stoRe', '+255 700 000 000', 'Kariakoo, Dar es Salaam', 18, 'TSh', 'en', 500);

insert into public.products (store_id, name, brand, category, supplier, buy_price, sell_price, qty, min_stock, date_added) values
  ('00000000-0000-0000-0000-000000000001', 'Coca-Cola 35cl Crate', 'Coca-Cola', 'Crated', 'Metro Bottlers Ltd', 2800, 3200, 45, 20, '2026-06-01'),
  ('00000000-0000-0000-0000-000000000001', 'Fanta Orange 35cl Crate', 'Fanta', 'Crated', 'Metro Bottlers Ltd', 2700, 3100, 38, 20, '2026-06-01'),
  ('00000000-0000-0000-0000-000000000001', 'Sprite 35cl Crate', 'Sprite', 'Crated', 'Metro Bottlers Ltd', 2700, 3100, 12, 20, '2026-06-03'),
  ('00000000-0000-0000-0000-000000000001', 'Star Lager Beer Crate', 'Star', 'Crated', 'Golden Hops Distillers', 6200, 7000, 25, 15, '2026-06-05'),
  ('00000000-0000-0000-0000-000000000001', 'Guinness Malt Crate', 'Guinness', 'Crated', 'Golden Hops Distillers', 6500, 7300, 30, 15, '2026-06-05'),
  ('00000000-0000-0000-0000-000000000001', 'Soda Water Crate', 'Schweppes', 'Crated', 'Metro Bottlers Ltd', 2500, 2900, 18, 15, '2026-06-08'),
  ('00000000-0000-0000-0000-000000000001', 'Coca-Cola Can Box (24)', 'Coca-Cola', 'Boxed', 'Metro Bottlers Ltd', 3600, 4200, 40, 15, '2026-06-02'),
  ('00000000-0000-0000-0000-000000000001', 'Sprite Can Box (24)', 'Sprite', 'Boxed', 'Metro Bottlers Ltd', 3500, 4100, 10, 15, '2026-06-02'),
  ('00000000-0000-0000-0000-000000000001', 'Bullet Energy Drink Box (24)', 'Bullet', 'Boxed', 'PowerUp Distributors', 5200, 6000, 22, 10, '2026-06-06'),
  ('00000000-0000-0000-0000-000000000001', 'Malt Can Box (24)', 'Amstel Malta', 'Boxed', 'Golden Hops Distillers', 5000, 5800, 28, 10, '2026-06-06');

insert into public.crate_records (store_id, customer, product_id, product_name_snapshot, taken, returned, status)
select '00000000-0000-0000-0000-000000000001', v.customer, p.id, p.name, v.taken, v.returned,
       case when v.taken - v.returned <= 0 then 'Cleared' else 'Outstanding' end
from (values
  ('Chidi''s Bar', 'Star Lager Beer Crate', 20, 12),
  ('Joy Supermarket', 'Coca-Cola 35cl Crate', 15, 15),
  ('Fatima Stores', 'Guinness Malt Crate', 10, 4)
) as v(customer, product_name, taken, returned)
join public.products p on p.name = v.product_name and p.store_id = '00000000-0000-0000-0000-000000000001';
