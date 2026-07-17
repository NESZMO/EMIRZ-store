import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { getDb } from "@/lib/db";
import { createSessionToken, SESSION_COOKIE } from "@/lib/auth-session";

export async function POST(request: Request) {
  const { username, password, rememberMe = true } = await request.json();
  if (!username || !password) {
    return NextResponse.json({ error: "Username and password are required." }, { status: 400 });
  }

  const db = getDb();
  const user = db
    .prepare("select * from users where lower(username) = lower(?)")
    .get(String(username).trim()) as { id: string; password_hash: string } | undefined;

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return NextResponse.json({ error: "Incorrect username or password." }, { status: 401 });
  }

  const token = createSessionToken(user.id);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    // Omitting maxAge makes it a session cookie that clears when the browser closes.
    ...(rememberMe ? { maxAge: 60 * 60 * 24 * 30 } : {}),
  });

  return NextResponse.json({ ok: true });
}
