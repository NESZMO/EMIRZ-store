import type { CrateRecordRow, ProductRow } from "@/lib/database.types";
import type { SaleWithItems } from "@/lib/hooks/useSalesWithItems";

export function isLowStock(p: Pick<ProductRow, "qty" | "min_stock">) {
  return p.qty < p.min_stock;
}

export function crateOutstanding(c: Pick<CrateRecordRow, "taken" | "returned">) {
  return Math.max(0, c.taken - c.returned);
}

export function isSameDay(iso: string, day: Date) {
  const d = new Date(iso);
  return (
    d.getFullYear() === day.getFullYear() &&
    d.getMonth() === day.getMonth() &&
    d.getDate() === day.getDate()
  );
}

export function isToday(iso: string) {
  return isSameDay(iso, new Date());
}

export function lastNDays(n: number): Date[] {
  const days: Date[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d);
  }
  return days;
}

export function saleProfit(sale: SaleWithItems): number {
  return sale.sale_items.reduce((sum, item) => sum + (item.unit_price - item.buy_price_snapshot) * item.qty, 0);
}

export function itemsSummary(sale: SaleWithItems): string {
  const count = sale.sale_items.reduce((a, i) => a + i.qty, 0);
  return `${count} item${count === 1 ? "" : "s"}`;
}

export function weekdayShortLabels(lang: "en" | "sw"): string[] {
  const en = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const sw = ["Jtt", "Jnn", "Jtn", "Alh", "Iju", "Jmo", "Jpi"];
  return lang === "sw" ? sw : en;
}
