import crypto from "crypto";
import { cookies } from "next/headers";
import { getDb } from "@/lib/db";
import { SESSION_COOKIE } from "@/lib/session-cookie-name";

export { SESSION_COOKIE };
const SESSION_DAYS = 30;

function secret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s) {
    throw new Error("AUTH_SECRET is not set — add it to .env.local (see .env.local.example)");
  }
  return s;
}

function sign(value: string): string {
  return crypto.createHmac("sha256", secret()).update(value).digest("hex");
}

export function createSessionToken(userId: string): string {
  const exp = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  const payload = `${userId}.${exp}`;
  const signature = sign(payload);
  return Buffer.from(`${payload}.${signature}`).toString("base64url");
}

function verifySessionToken(token: string): { userId: string } | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const [userId, expStr, signature] = decoded.split(".");
    if (!userId || !expStr || !signature) return null;
    const expected = sign(`${userId}.${expStr}`);
    if (signature !== expected) return null;
    if (Date.now() > Number(expStr)) return null;
    return { userId };
  } catch {
    return null;
  }
}

export interface SessionUser {
  id: string;
  store_id: string;
  username: string;
  display_name: string;
  role: "manager" | "cashier";
}

export interface SessionStore {
  id: string;
  name: string;
  phone: string;
  address: string;
  tax_rate_pct: number;
  currency_symbol: string;
  language: "en" | "sw";
  notifications_enabled: number;
  crate_deposit_per_unit: number;
}

export async function getSession(): Promise<{ user: SessionUser; store: SessionStore } | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const verified = verifySessionToken(token);
  if (!verified) return null;

  const db = getDb();
  const user = db.prepare("select * from users where id = ?").get(verified.userId) as SessionUser | undefined;
  if (!user) return null;
  const store = db.prepare("select * from stores where id = ?").get(user.store_id) as SessionStore | undefined;
  if (!store) return null;
  return { user, store };
}
