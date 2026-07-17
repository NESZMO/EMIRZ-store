"use server";

import bcrypt from "bcryptjs";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/auth-session";

export async function updatePassword(currentPassword: string, newPassword: string) {
  const session = await getSession();
  if (!session) throw new Error("Not signed in.");

  const db = getDb();
  const row = db.prepare("select password_hash from users where id = ?").get(session.user.id) as { password_hash: string } | undefined;
  if (!row || !bcrypt.compareSync(currentPassword, row.password_hash)) {
    return { ok: false as const, reason: "wrong_current" as const };
  }
  const hash = bcrypt.hashSync(newPassword, 10);
  db.prepare("update users set password_hash = ? where id = ?").run(hash, session.user.id);
  return { ok: true as const };
}
