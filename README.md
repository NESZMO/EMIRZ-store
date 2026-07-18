# EMIRZ stoRe

Local, offline-first store management app for a beverage distribution business — inventory, daily sales (POS), crate deposit tracking, incoming stock, pending payments, reports, and settings. Runs entirely on one PC: no internet, no cloud account, no external service. Data lives in a single file (`data/store.db`) on that machine. Every browser tab open against it sees stock and sales changes live via a local real-time bridge.

## First-time setup

1. Copy `.env.local.example` to `.env.local` — it already has a random secret filled in, no editing needed unless you want to change it.
2. Double-click **`run.bat`** (or the **"EMIRZ stoRe"** shortcut on the Desktop, which does the same thing). The first run installs dependencies and builds the app (takes a minute or two); every run after that starts instantly and opens your browser automatically once it's ready.
3. Sign in with the default manager login: **username `manager`, password `emirz123`** — then go to Settings and change the password.

That's it — no account to create, no migration to run. The database and its starter products/crates are created automatically the first time the app starts.

## Day to day

Double-click the **"EMIRZ stoRe"** shortcut on the Desktop. It starts minimized and opens your browser to the app automatically once ready. A window stays in the taskbar while it runs — closing it stops the app. Opening the app in a second browser tab (or a second machine on the same network via `http://<this-pc's-LAN-IP>:3000`) is supported and stays in sync.

## Adding a cashier account

There's no UI for this yet. Ask for help running a short one-off script, or do it via the SQLite file directly (`data/store.db`) with any SQLite browser — insert a row into `users` with a bcrypt-hashed password and `role = 'cashier'`.

## Notes on this v1

- **Business logo upload** in Settings is a placeholder — not wired up yet.
- **Undo/Redo** covers the most common corrections (inventory qty adjustments/deletes, crate returns, payment updates) via a 5-step in-session history — it's per-browser-tab, not shared across tabs.
- **Backup & Restore** in Settings downloads/restores a JSON snapshot — a quick way to move data between installs or keep an extra copy. The full `data/store.db` file can also just be copied directly for a complete backup.

## Development

```bash
npm install
npm run dev
```

`npm run dev` runs the unoptimized development server (slower, hot-reloading) — for actual day-to-day use, always use `run.bat` (production build).
