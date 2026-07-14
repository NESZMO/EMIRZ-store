import type { SaleWithItems } from "@/lib/hooks/useSalesWithItems";

export interface ReceiptData {
  receiptNo: string;
  cashier: string;
  date: string;
  time: string;
  customerName: string;
  lines: { name: string; qty: number; unitPriceFmt: string; lineTotalFmt: string }[];
  subtotalFmt: string;
  crateChargeFmt: string;
  discountFmt: string;
  grandTotalFmt: string;
  paidFmt: string;
  balanceFmt: string;
}

export function buildReceipt(sale: SaleWithItems, fmt: (n: number) => string): ReceiptData {
  const d = new Date(sale.created_at);
  return {
    receiptNo: sale.id.slice(0, 8).toUpperCase(),
    cashier: sale.cashier_name_snapshot || "—",
    date: d.toLocaleDateString(),
    time: d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    customerName: sale.customer_name || "Walk-in Customer",
    lines: sale.sale_items.map((i) => ({
      name: i.name_snapshot,
      qty: i.qty,
      unitPriceFmt: fmt(i.unit_price),
      lineTotalFmt: fmt(i.line_total),
    })),
    subtotalFmt: fmt(sale.subtotal),
    crateChargeFmt: fmt(sale.crate_charge),
    discountFmt: fmt(sale.discount_amount),
    grandTotalFmt: fmt(sale.grand_total),
    paidFmt: fmt(sale.amount_paid),
    balanceFmt: fmt(sale.balance),
  };
}
