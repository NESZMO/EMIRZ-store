"use client";

import { useStore } from "@/lib/store-context";
import type { ReceiptData } from "@/lib/receipt";

export function ReceiptModal({ receipt, onClose }: { receipt: ReceiptData; onClose: () => void }) {
  const { tt, store } = useStore();

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4 print:bg-white">
      <div
        className="w-[320px] max-h-[90vh] overflow-y-auto rounded-[10px] px-5 py-5.5 font-mono print:shadow-none"
        style={{ background: "var(--color-receipt-bg)", color: "var(--color-receipt-text)" }}
      >
        <div className="text-center font-bold text-base tracking-wide">{store?.name || "EMIRZ stoRe"}</div>
        <div className="text-center text-[11px] text-neutral-600 mb-2.5">{tt("receiptSubtitle")}</div>
        <div className="border-t border-dashed border-neutral-400 my-2" />
        <Row label={tt("receiptNoLabel")} value={receipt.receiptNo} />
        <Row label={tt("cashierLabel")} value={receipt.cashier} />
        <Row label={tt("dateLabel")} value={`${receipt.date} ${receipt.time}`} />
        <Row label={tt("customerLabel")} value={receipt.customerName} />
        <div className="border-t border-dashed border-neutral-400 my-2.5" />
        {receipt.lines.map((l, i) => (
          <div key={i} className="text-[11.5px] mb-1">
            <div>{l.name}</div>
            <div className="flex justify-between text-neutral-600">
              <div>
                {l.qty} × {l.unitPriceFmt}
              </div>
              <div>{l.lineTotalFmt}</div>
            </div>
          </div>
        ))}
        <div className="border-t border-dashed border-neutral-400 my-2.5" />
        <Row label={tt("subtotal")} value={receipt.subtotalFmt} />
        <Row label={tt("crateCharges")} value={receipt.crateChargeFmt} />
        <Row label={tt("discount")} value={`-${receipt.discountFmt}`} />
        <div className="flex justify-between text-[13px] font-bold mt-1.5">
          <div>{tt("totalLabel")}</div>
          <div>{receipt.grandTotalFmt}</div>
        </div>
        <Row label={tt("paidLabel")} value={receipt.paidFmt} className="mt-1.5" />
        <Row label={tt("balanceLabel2")} value={receipt.balanceFmt} />
        <div className="border-t border-dashed border-neutral-400 my-2.5" />
        <div className="text-center text-[11.5px] mb-3.5">{tt("thankYou")}</div>
        <div className="flex gap-2 print:hidden">
          <button onClick={() => window.print()} className="flex-1 py-2.5 rounded-md bg-neutral-900 text-white text-xs font-bold cursor-pointer">
            {tt("print")}
          </button>
          <button onClick={onClose} className="flex-1 py-2.5 rounded-md border border-neutral-400 text-neutral-800 text-xs font-semibold cursor-pointer">
            {tt("close")}
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  return (
    <div className={`text-[11.5px] flex justify-between ${className}`}>
      <div>{label}</div>
      <div>{value}</div>
    </div>
  );
}
