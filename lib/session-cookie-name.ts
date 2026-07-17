// Kept in its own zero-dependency file so proxy.ts (which runs on the Edge
// runtime) can import just the cookie name without pulling in Node-only
// code (crypto, better-sqlite3) from lib/auth-session.ts / lib/db.ts.
export const SESSION_COOKIE = "emirz_session";
