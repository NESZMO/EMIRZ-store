"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/lib/store-context";
import { useRealtimeTable } from "@/lib/hooks/useRealtimeTable";
import { updateStoreInfo, setLanguage as setStoreLanguage, toggleNotifications as toggleStoreNotifications, restoreBackup } from "@/lib/actions/settings";
import { updatePassword } from "@/lib/actions/auth";
import { PageHeader } from "@/components/PageHeader";
import { EyeIcon } from "@/components/icons/EyeIcon";
import { fieldClass, primaryBtnClass, ghostBtnClass, cardClass, labelClass } from "@/lib/ui";
import { downloadJSON } from "@/lib/csv";
import type { CrateRecordRow, IncomingStockRow, PendingPaymentRow, ProfileRow, ProductRow } from "@/lib/database.types";
import { useSalesWithItems } from "@/lib/hooks/useSalesWithItems";

export default function SettingsPage() {
  const { store, profile, tt } = useStore();
  const storeId = store?.id;
  const isManager = profile?.role === "manager";

  const { rows: products } = useRealtimeTable<ProductRow>("products", storeId);
  const { rows: incoming } = useRealtimeTable<IncomingStockRow>("incoming_stock", storeId);
  const { rows: crates } = useRealtimeTable<CrateRecordRow>("crate_records", storeId);
  const { rows: payments } = useRealtimeTable<PendingPaymentRow>("pending_payments", storeId);
  const { sales } = useSalesWithItems(storeId);
  const [teammates, setTeammates] = useState<ProfileRow[]>([]);

  useEffect(() => {
    if (!storeId) return;
    fetch("/api/profiles", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))
      .then(setTeammates);
  }, [storeId]);

  const [storeDraft, setStoreDraft] = useState({ name: "", phone: "", address: "", taxRatePct: "", crateChargePerUnit: "" });
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [storeMsg, setStoreMsg] = useState("");

  useEffect(() => {
    if (!store) return;
    setStoreDraft({
      name: store.name,
      phone: store.phone,
      address: store.address,
      taxRatePct: String(store.tax_rate_pct),
      crateChargePerUnit: String(store.crate_deposit_per_unit),
    });
    setNotificationsEnabled(store.notifications_enabled);
  }, [store]);

  async function onSaveStoreInfo() {
    if (!storeId) return;
    await updateStoreInfo({
      name: storeDraft.name,
      phone: storeDraft.phone,
      address: storeDraft.address,
      tax_rate_pct: Number(storeDraft.taxRatePct) || 0,
      crate_deposit_per_unit: Number(storeDraft.crateChargePerUnit) || 0,
    });
    setStoreMsg(tt("save") + " ✓");
    setTimeout(() => setStoreMsg(""), 2000);
  }

  async function onSetLanguage(lang: "en" | "sw") {
    if (!storeId) return;
    await setStoreLanguage(lang);
  }

  async function onToggleNotifications(checked: boolean) {
    setNotificationsEnabled(checked);
    if (!storeId) return;
    await toggleStoreNotifications(checked);
  }

  // ---- Password & security ----
  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [showPwCurrent, setShowPwCurrent] = useState(false);
  const [showPwNew, setShowPwNew] = useState(false);
  const [pwMsg, setPwMsg] = useState("");

  async function onUpdatePassword() {
    setPwMsg("");
    if (!pwNew.trim()) {
      setPwMsg(tt("nothingToUpdateMsg"));
      return;
    }
    if (pwNew.trim().length < 6) {
      setPwMsg(tt("pwTooShortMsg"));
      return;
    }
    const result = await updatePassword(pwCurrent, pwNew);
    if (!result.ok) {
      setPwMsg(tt("pwWrongCurrentMsg"));
      return;
    }
    setPwMsg(tt("pwUpdatedMsg"));
    setPwCurrent("");
    setPwNew("");
  }

  // ---- Backup & restore ----
  const [restoreMessage, setRestoreMessage] = useState("");

  function onBackupData() {
    const snapshot = {
      products,
      sales,
      crateRecords: crates,
      incomingHistory: incoming,
      pendingPayments: payments,
      settings: store,
      exportedAt: new Date().toISOString(),
    };
    downloadJSON("emirz_store_backup.json", snapshot);
  }

  async function onRestoreFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !storeId) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      await restoreBackup(data);
      setRestoreMessage(tt("restoredMsg"));
    } catch {
      setRestoreMessage(tt("restoreErrorMsg"));
    }
    e.target.value = "";
  }

  return (
    <div>
      <PageHeader title={tt("titleSettings")} subtitle={tt("subSettings")} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className={`${cardClass} p-5.5`}>
          <div className="font-bold text-[15px] mb-4">{tt("storeInfo")}</div>
          <div className={labelClass}>{tt("storeNameLabel")}</div>
          <input className={`${fieldClass} mb-3.5`} value={storeDraft.name} disabled={!isManager} onChange={(e) => setStoreDraft({ ...storeDraft, name: e.target.value })} />
          <div className={labelClass}>{tt("phoneLabel")}</div>
          <input className={`${fieldClass} mb-3.5`} value={storeDraft.phone} disabled={!isManager} onChange={(e) => setStoreDraft({ ...storeDraft, phone: e.target.value })} />
          <div className={labelClass}>{tt("addressLabel")}</div>
          <input className={`${fieldClass} mb-3.5`} value={storeDraft.address} disabled={!isManager} onChange={(e) => setStoreDraft({ ...storeDraft, address: e.target.value })} />
          {isManager && (
            <div className="flex items-center gap-2.5">
              <button onClick={onSaveStoreInfo} className={primaryBtnClass}>
                {tt("save")}
              </button>
              {storeMsg && <div className="text-xs text-primary font-semibold">{storeMsg}</div>}
            </div>
          )}
        </div>

        <div className={`${cardClass} p-5.5`}>
          <div className="font-bold text-[15px] mb-4">{tt("taxCurrency")}</div>
          <div className={labelClass}>{tt("taxRateLabel")}</div>
          <input className={`${fieldClass} mb-3.5`} value={storeDraft.taxRatePct} disabled={!isManager} onChange={(e) => setStoreDraft({ ...storeDraft, taxRatePct: e.target.value })} />
          <div className={labelClass}>Currency</div>
          <div className={`${fieldClass} flex items-center text-text-dim mb-3.5`}>
            {store?.currency_symbol} — {tt("currencyLine")}
          </div>
          <div className={labelClass}>{tt("crateChargeLabel")}</div>
          <input
            className={fieldClass}
            value={storeDraft.crateChargePerUnit}
            disabled={!isManager}
            onChange={(e) => setStoreDraft({ ...storeDraft, crateChargePerUnit: e.target.value })}
          />
          <div className="text-xs text-muted-3 mt-1.5 mb-2.5">{tt("crateChargeDesc")}</div>
          {isManager && (
            <div className="flex items-center gap-2.5 mb-4.5">
              <button onClick={onSaveStoreInfo} className={primaryBtnClass}>
                {tt("save")}
              </button>
              {storeMsg && <div className="text-xs text-primary font-semibold">{storeMsg}</div>}
            </div>
          )}
          <div className="h-px bg-line my-4.5" />
          <div className={`${labelClass} mb-2`}>{tt("languageLabel")}</div>
          <div className="flex gap-2 mb-4.5">
            <button
              onClick={() => onSetLanguage("en")}
              className="flex-1 text-center py-2.5 rounded-[9px] text-[13px] font-bold cursor-pointer"
              style={{ background: store?.language === "en" ? "var(--color-primary)" : "var(--color-field)", color: store?.language === "en" ? "var(--color-bg)" : "var(--color-text-dim)" }}
            >
              {tt("english")}
            </button>
            <button
              onClick={() => onSetLanguage("sw")}
              className="flex-1 text-center py-2.5 rounded-[9px] text-[13px] font-bold cursor-pointer"
              style={{ background: store?.language === "sw" ? "var(--color-primary)" : "var(--color-field)", color: store?.language === "sw" ? "var(--color-bg)" : "var(--color-text-dim)" }}
            >
              {tt("swahili")}
            </button>
          </div>
          <div className="font-bold text-sm mb-2.5">{tt("usersRoles")}</div>
          {teammates.map((m) => (
            <div key={m.id} className="flex items-center justify-between py-2 text-[13px]">
              <div>{m.display_name || m.username}</div>
              <div className={m.role === "manager" ? "font-bold text-gold" : "text-muted-2"}>{m.role === "manager" ? tt("sidebarManager") : tt("cashierRole")}</div>
            </div>
          ))}
        </div>

        <div className={`${cardClass} p-5.5`}>
          <div className="font-bold text-[15px] mb-4">{tt("passwordSecurity")}</div>
          <div className={labelClass}>{tt("currentPassword")}</div>
          <div className="relative mb-3.5">
            <input
              type={showPwCurrent ? "text" : "password"}
              className={`${fieldClass} pr-11`}
              value={pwCurrent}
              onChange={(e) => setPwCurrent(e.target.value)}
              placeholder="••••••••"
            />
            <button type="button" onClick={() => setShowPwCurrent((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-2 cursor-pointer">
              <EyeIcon open={showPwCurrent} size={17} />
            </button>
          </div>
          <div className={labelClass}>{tt("newPassword")}</div>
          <div className="relative mb-4">
            <input
              type={showPwNew ? "text" : "password"}
              className={`${fieldClass} pr-11`}
              value={pwNew}
              onChange={(e) => setPwNew(e.target.value)}
              placeholder="••••••••"
            />
            <button type="button" onClick={() => setShowPwNew((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-2 cursor-pointer">
              <EyeIcon open={showPwNew} size={17} />
            </button>
          </div>
          <button onClick={onUpdatePassword} className={`${primaryBtnClass} w-full`}>
            {tt("updatePassword")}
          </button>
          {pwMsg && <div className="mt-3 text-[12.5px] font-semibold text-gold">{pwMsg}</div>}
          <div className="h-px bg-line my-4.5" />
          <label className="flex items-center gap-2 text-[13px] text-text-dim cursor-pointer">
            <input type="checkbox" checked={notificationsEnabled} onChange={(e) => onToggleNotifications(e.target.checked)} className="accent-primary" />
            {tt("enableNotifications")}
          </label>
        </div>

        <div className={`${cardClass} p-5.5`}>
          <div className="font-bold text-[15px] mb-4">{tt("backupRestore")}</div>
          <div className="text-[13px] text-muted mb-3.5">{tt("backupDesc")}</div>
          <button onClick={onBackupData} className={`${primaryBtnClass} w-full mb-2.5`}>
            {tt("backupData")}
          </button>
          {isManager && (
            <label className={`${ghostBtnClass} block w-full text-center`}>
              {tt("restoreData")}
              <input type="file" accept="application/json" onChange={onRestoreFile} className="hidden" />
            </label>
          )}
          {restoreMessage && <div className="mt-3 text-xs text-gold">{restoreMessage}</div>}
        </div>
      </div>
    </div>
  );
}
