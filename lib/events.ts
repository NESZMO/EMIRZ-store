import { EventEmitter } from "events";

declare global {
  var __emirzEvents: EventEmitter | undefined;
}

function getEmitter(): EventEmitter {
  if (!global.__emirzEvents) {
    const emitter = new EventEmitter();
    emitter.setMaxListeners(100);
    global.__emirzEvents = emitter;
  }
  return global.__emirzEvents;
}

export type ChangedTable =
  | "products"
  | "incoming_stock"
  | "sales"
  | "sale_items"
  | "crate_records"
  | "pending_payments"
  | "stores";

/** Called after a Server Action commits a write, so open SSE connections can tell clients to refetch. */
export function broadcast(table: ChangedTable) {
  getEmitter().emit("change", table);
}

export function subscribe(listener: (table: ChangedTable) => void): () => void {
  const emitter = getEmitter();
  emitter.on("change", listener);
  return () => emitter.off("change", listener);
}
