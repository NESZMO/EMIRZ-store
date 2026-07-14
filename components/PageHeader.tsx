"use client";

import { useUndo } from "@/lib/undo-context";

export function PageHeader({ title, subtitle }: { title: string; subtitle: string }) {
  const { canUndo, canRedo, undo, redo } = useUndo();
  const today = new Date().toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "short", day: "numeric" });

  return (
    <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
      <div>
        <div className="font-display text-2xl font-bold">{title}</div>
        <div className="text-[13px] text-muted-2 mt-0.5">{subtitle}</div>
      </div>
      <div className="flex items-center gap-3.5">
        <button
          onClick={undo}
          disabled={!canUndo}
          className="px-4 py-2.5 rounded-lg border border-line text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition"
          style={{ color: "var(--color-text-dim)" }}
        >
          ↶ Undo
        </button>
        <button
          onClick={redo}
          disabled={!canRedo}
          className="px-4 py-2.5 rounded-lg border border-line text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition"
          style={{ color: "var(--color-text-dim)" }}
        >
          ↷ Redo
        </button>
        <div className="w-[38px] h-[38px] rounded-[10px] bg-panel border border-line flex items-center justify-center">
          <div className="w-[9px] h-[9px] rounded-full bg-gold" />
        </div>
        <div className="text-[13px] text-muted-2 whitespace-nowrap">{today}</div>
      </div>
    </div>
  );
}
