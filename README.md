# EMIRZ stoRe

Real-time store management app for a beverage distribution business — inventory, daily sales (POS), crate deposit tracking, incoming stock, pending payments, reports, and settings. Built with Next.js + Supabase (Postgres, Auth, Realtime). Every connected device (manager, cashier) sees stock and sales changes live.

## 1. Create your Supabase project

1. Go to [supabase.com](https://supabase.com) and create a free project.
2. In **Project Settings → API**, copy the **Project URL** and **anon public key**.
3. Copy `.env.local.example` to `.env.local` and paste those two values in.

## 2. Set up the database

1. Open your Supabase project's **SQL Editor**.
2. Run `supabase/migrations/0001_init.sql` — creates all tables, Row Level Security policies, and seed products/crates.
3. Go to **Authentication → Users → Add user**. Create your manager login with email `manager@emirz.local` (or `<yourusername>@emirz.local` — the app maps the username you type on the login screen to `<username>@emirz.local` internally) and a password of your choice.
4. Copy that new user's UUID (shown in the Users table).
5. Open `supabase/migrations/0002_bootstrap_manager.sql`, paste the UUID in, adjust the username/display name if you like, and run it in the SQL Editor. This links your login to the EMIRZ stoRe store as a `manager`.

To add a cashier later: repeat steps 3–5 with `role: 'cashier'` instead of `'manager'` in the bootstrap insert.

## 3. Run it

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in with the username/password you created above.

## Notes on this v1

- **Business logo upload** in Settings is a placeholder — not wired to storage yet.
- **Editing a past sale** (from Sales History) isn't implemented; sales, once completed, are final. Individual line items like crate returns and payment records can still be corrected.
- **Undo/Redo** covers the most common corrections (inventory qty adjustments/deletes, crate returns, payment updates) via a 5-step in-session history — it's per-device, not a synced multi-user undo log.
- **PDF export** on the Reports page generates an actual PDF (via jsPDF) rather than using the browser print dialog.

## Deploying

Push to a GitHub repo and import it on [Vercel](https://vercel.com/new) — set the same two `NEXT_PUBLIC_SUPABASE_*` environment variables there. No other config needed; the app is fully client/Supabase-driven.
