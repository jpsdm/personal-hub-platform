"use client";

import { useCallback, useMemo, useState } from "react";
import type { VirtualOccurrence } from "../types";

type SelectionMap = Record<string, VirtualOccurrence>;

export function useReceiptGenerator(initialSelection: VirtualOccurrence[] = []) {
  const [selection, setSelection] = useState<SelectionMap>(() => {
    return initialSelection.reduce<SelectionMap>((acc, tx) => {
      if (tx.type === "EXPENSE") {
        acc[tx.id] = tx;
      }
      return acc;
    }, {});
  });

  const toggleTransaction = useCallback((tx: VirtualOccurrence) => {
    if (tx.type !== "EXPENSE") {
      return;
    }

    setSelection((prev) => {
      const next = { ...prev };
      if (next[tx.id]) {
        delete next[tx.id];
      } else {
        next[tx.id] = tx;
      }
      return next;
    });
  }, []);

  const removeTransaction = useCallback((id: string) => {
    setSelection((prev) => {
      if (!prev[id]) {
        return prev;
      }
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelection({});
  }, []);

  const syncSelection = useCallback((latest: VirtualOccurrence[]) => {
    setSelection((prev) => {
      if (Object.keys(prev).length === 0) {
        return prev;
      }

      let changed = false;
      const next = { ...prev };

      latest.forEach((tx) => {
        if (!next[tx.id]) {
          return;
        }

        if (tx.type !== "EXPENSE" || tx.status !== "PAID") {
          delete next[tx.id];
          changed = true;
          return;
        }

        if (next[tx.id] !== tx) {
          next[tx.id] = tx;
          changed = true;
        }
      });

      return changed ? next : prev;
    });
  }, []);

  const selectedTransactions = useMemo(() => {
    return Object.values(selection).sort((a, b) => {
      const aTime = new Date(a.dueDate).getTime();
      const bTime = new Date(b.dueDate).getTime();
      return aTime - bTime;
    });
  }, [selection]);

  const totalAmount = useMemo(() => {
    return selectedTransactions.reduce((sum, tx) => sum + tx.amount, 0);
  }, [selectedTransactions]);

  const isSelected = useCallback(
    (id: string) => {
      return Boolean(selection[id]);
    },
    [selection]
  );

  return {
    selectedTransactions,
    totalAmount,
    toggleTransaction,
    removeTransaction,
    clearSelection,
    isSelected,
    syncSelection,
  };
}
