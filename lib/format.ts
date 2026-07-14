export function fmtCurrency(amount: number, symbol: string): string {
  const num = Number(amount) || 0;
  return `${symbol} ${num.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function fmtTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}
