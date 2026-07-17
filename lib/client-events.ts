"use client";

type Listener = (table: string) => void;

let es: EventSource | null = null;
const listeners = new Set<Listener>();

function ensureConnection() {
  if (es || typeof window === "undefined") return;
  es = new EventSource("/api/events");
  es.onmessage = (e) => {
    listeners.forEach((l) => l(e.data));
  };
  // EventSource reconnects automatically on error/disconnect — nothing to do here.
}

/** Live-update bridge: one shared connection to /api/events, fanned out to every subscriber. */
export function subscribeToChanges(listener: Listener): () => void {
  ensureConnection();
  listeners.add(listener);
  return () => listeners.delete(listener);
}
