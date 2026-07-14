"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

interface UndoEntry {
  label: string;
  undo: () => PromiseLike<unknown> | void;
  redo: () => PromiseLike<unknown> | void;
}

interface UndoContextValue {
  canUndo: boolean;
  canRedo: boolean;
  push: (entry: UndoEntry) => void;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
}

const UndoContext = createContext<UndoContextValue | null>(null);
const MAX_STEPS = 5;

export function UndoProvider({ children }: { children: React.ReactNode }) {
  const [past, setPast] = useState<UndoEntry[]>([]);
  const [future, setFuture] = useState<UndoEntry[]>([]);

  const push = useCallback((entry: UndoEntry) => {
    setPast((p) => [...p, entry].slice(-MAX_STEPS));
    setFuture([]);
  }, []);

  const undo = useCallback(async () => {
    setPast((p) => {
      if (p.length === 0) return p;
      const entry = p[p.length - 1];
      entry.undo();
      setFuture((f) => [entry, ...f].slice(0, MAX_STEPS));
      return p.slice(0, -1);
    });
  }, []);

  const redo = useCallback(async () => {
    setFuture((f) => {
      if (f.length === 0) return f;
      const entry = f[0];
      entry.redo();
      setPast((p) => [...p, entry].slice(-MAX_STEPS));
      return f.slice(1);
    });
  }, []);

  const value = useMemo<UndoContextValue>(
    () => ({ canUndo: past.length > 0, canRedo: future.length > 0, push, undo, redo }),
    [past.length, future.length, push, undo, redo],
  );

  return <UndoContext.Provider value={value}>{children}</UndoContext.Provider>;
}

export function useUndo() {
  const ctx = useContext(UndoContext);
  if (!ctx) throw new Error("useUndo must be used within an UndoProvider");
  return ctx;
}
