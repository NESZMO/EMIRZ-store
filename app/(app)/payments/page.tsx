"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/lib/store-context";
import { useUndo } from "@/lib/undo-context";
import { useRealtimeTable } from "@/lib/hooks/useRealtimeTable";
import { createPayment, updatePayment } from "@/lib/actions/payments";
import { PageHeader } from "@/components/PageHeader";
import { fieldClass, primaryBtnClass, ghostBtnClass, cardClass } from "@/lib/ui";
import type { PaymentStatus, PendingPaymentRow } from "@/lib/database.types";

const EMPTY_FORM = { customer: "", phone: "", products: "", total: "", paid: "", dueDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10) };

export default function PaymentsPage() {
  const { store, tt, fmt } = useStore();
  const { push } = useUndo();
  const storeId = store?.id;
  const { rows: payments } = useRealtimeTable<PendingPaymentRow>("pending_payments", storeId);

  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState(EMPTY_FORM);
  const [amountInputs, setAmountInputs] = useState<Record<string, string>>({});

  const filtered = useMemo(
    () => payments.filter((p) => p.customer.toLowerCase().includes(search.toLowerCase())),
    [payments, search],
  );

  function openAdd() {
    setDraft({ ...EMPTY_FORM, dueDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10) });
    setShowForm(true);
  }

  async function onSave() {
    if (!draft.customer.trim() || !storeId) return;
    const total = Number(draft.total) || 0;
    if (total <= 0) return;
    const paid = Number(draft.paid) || 0;
    const balance = Math.max(0, total - paid);
    const status: PaymentStatus = balance <= 0 ? "Paid" : paid > 0 ? "Partial" : "Unpaid";
    await createPayment({
      customer: draft.customer,
      phone: draft.phone,
      products_text: draft.products,
      total,
      paid,
      balance,
      status,
      due_date: draft.dueDate || null,
    });
    setShowForm(false);
  }

  async function onRecordPayment(r: PendingPaymentRow) {
    const extra = Number(amountInputs[r.id]) || 0;
    if (extra <= 0) return;
    const prevPaid = r.paid;
    const prevBalance = r.balance;
    const prevStatus = r.status;
    const paid = r.paid + extra;
    const balance = Math.max(0, r.total - paid);
    const status: PaymentStatus = balance <= 0 ? "Paid" : "Partial";
    await updatePayment(r.id, { paid, balance, status });
    setAmountInputs((a) => ({ ...a, [r.id]: "" }));
    push({
      label: `payment ${r.customer}`,
      undo: () => updatePayment(r.id, { paid: prevPaid, balance: prevBalance, status: prevStatus }),
      redo: () => updatePayment(r.id, { paid, balance, status }),
    });
  }

  async function onMarkPaid(r: PendingPaymentRow) {
    const prevPaid = r.paid;
    const prevBalance = r.balance;
    const prevStatus = r.status;
    await updatePayment(r.id, { paid: r.total, balance: 0, status: "Paid" });
    push({
      label: `mark paid ${r.customer}`,
      undo: () => updatePayment(r.id, { paid: prevPaid, balance: prevBalance, status: prevStatus }),
      redo: () => updatePayment(r.id, { paid: r.total, balance: 0, status: "Paid" }),
    });
  }

  return (
    <div>
      <PageHeader title={tt("titlePayments")} subtitle={tt("subPayments")} />

      <div className="flex items-center gap-2.5 mb-4.5 flex-wrap">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={tt("searchCustomer")} className={`${fieldClass} w-[230px]`} />
        <div className="flex-1" />
        <button onClick={openAdd} className={primaryBtnClass}>
          {tt("recordPayment")}
        </button>
      </div>

      {showForm && (
        <div className={`${cardClass} p-5 mb-4.5`} style={{ borderColor: "var(--color-gold)" }}>
          <div className="font-bold text-sm mb-3.5">{tt("newCreditSale")}</div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3.5">
            <input className={fieldClass} placeholder={tt("phCustomerName")} value={draft.customer} onChange={(e) => setDraft({ ...draft, customer: e.target.value })} />
            <input className={fieldClass} placeholder={tt("phPhone")} value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} />
            <input className={fieldClass} placeholder={tt("phProducts")} value={draft.products} onChange={(e) => setDraft({ ...draft, products: e.target.value })} />
            <input className={fieldClass} placeholder={tt("phTotalAmount")} value={draft.total} onChange={(e) => setDraft({ ...draft, total: e.target.value })} />
            <input className={fieldClass} placeholder={tt("phAmountPaid")} value={draft.paid} onChange={(e) => setDraft({ ...draft, paid: e.target.value })} />
            <input type="date" className={fieldClass} value={draft.dueDate} onChange={(e) => setDraft({ ...draft, dueDate: e.target.value })} />
          </div>
          <div className="flex gap-2.5">
            <button onClick={onSave} className={primaryBtnClass}>
              {tt("save")}
            </button>
            <button onClick={() => setShowForm(false)} className={ghostBtnClass}>
              {tt("cancel")}
            </button>
          </div>
        </div>
      )}

      <div className={`${cardClass} overflow-hidden overflow-x-auto`}>
        <div className="min-w-[1050px]">
          <div className="grid grid-cols-[1.2fr_1fr_1.5fr_0.9fr_0.9fr_0.9fr_0.9fr_1fr_1.6fr] gap-3.5 px-4.5 py-3 text-[11.5px] font-bold text-muted-4 tracking-wide border-b border-line">
            <div>{tt("colCustomer")}</div>
            <div>{tt("colPhone")}</div>
            <div>{tt("colProductsCol")}</div>
            <div>{tt("colTotal")}</div>
            <div>{tt("colPaid")}</div>
            <div>{tt("colBalance")}</div>
            <div>{tt("colStatus")}</div>
            <div>{tt("colDue")}</div>
            <div>{tt("colActions")}</div>
          </div>
          {filtered.map((r) => {
            const statusColors =
              r.status === "Paid"
                ? { bg: "var(--color-primary-soft)", color: "var(--color-primary)" }
                : r.status === "Partial"
                  ? { bg: "oklch(32% 0.06 55)", color: "var(--color-warning)" }
                  : { bg: "oklch(34% 0.1 25)", color: "var(--color-danger)" };
            return (
              <div key={r.id} className="grid grid-cols-[1.2fr_1fr_1.5fr_0.9fr_0.9fr_0.9fr_0.9fr_1fr_1.6fr] gap-3.5 px-4.5 py-3.5 items-center border-b border-line-soft text-[12.5px]">
                <div className="font-semibold">{r.customer}</div>
                <div className="text-muted-2">{r.phone}</div>
                <div className="text-muted truncate">{r.products_text}</div>
                <div>{fmt(r.total)}</div>
                <div>{fmt(r.paid)}</div>
                <div className="font-bold">{fmt(r.balance)}</div>
                <div>
                  <span className="inline-block px-2.5 py-1 rounded-full text-[11px] font-bold" style={{ background: statusColors.bg, color: statusColors.color }}>
                    {r.status === "Paid" ? tt("statusPaid") : r.status === "Partial" ? tt("statusPartial") : tt("statusUnpaid")}
                  </span>
                </div>
                <div className="text-muted-3">{r.due_date}</div>
                {r.status === "Paid" ? (
                  <div className="text-muted-4 text-xs">{tt("settled")}</div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <input
                      value={amountInputs[r.id] ?? ""}
                      onChange={(e) => setAmountInputs((a) => ({ ...a, [r.id]: e.target.value }))}
                      placeholder="Amt"
                      className="w-14 bg-field border border-line-strong rounded-[7px] px-1.5 py-1 text-xs outline-none"
                    />
                    <button onClick={() => onRecordPayment(r)} className="text-[11.5px] font-bold text-primary cursor-pointer">
                      {tt("pay")}
                    </button>
                    <button onClick={() => onMarkPaid(r)} className="text-[11.5px] font-bold text-gold cursor-pointer">
                      {tt("markPaid")}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
          {filtered.length === 0 && <div className="p-8 text-center text-muted-5 text-[13px]">{tt("noPaymentsMsg")}</div>}
        </div>
      </div>
    </div>
  );
}
