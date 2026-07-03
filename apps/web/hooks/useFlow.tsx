"use client";
import { createContext, useContext, useState, useCallback } from "react";
import type { Dataset, DatasetRow } from "@/lib/api";

export type SelectionType = "row" | "column" | "cell" | "range" | "filter";

export interface FlowSelection {
  type: SelectionType;
  spec: Record<string, unknown>;
  // A human-facing count + a preview of what's selected, for the UI
  count: number;
  previewRows: Record<string, string>[];
}

interface FlowState {
  dataset: Dataset | null;
  rows: DatasetRow[];
  selection: FlowSelection | null;
  setDataset: (d: Dataset, rows: DatasetRow[]) => void;
  setSelection: (s: FlowSelection | null) => void;
  reset: () => void;
}

const FlowContext = createContext<FlowState | null>(null);

export function FlowProvider({ children }: { children: React.ReactNode }) {
  const [dataset, setDatasetState] = useState<Dataset | null>(null);
  const [rows, setRows] = useState<DatasetRow[]>([]);
  const [selection, setSelection] = useState<FlowSelection | null>(null);

  const setDataset = useCallback((d: Dataset, r: DatasetRow[]) => {
    setDatasetState(d);
    setRows(r);
    setSelection(null);
  }, []);

  const reset = useCallback(() => {
    setDatasetState(null);
    setRows([]);
    setSelection(null);
  }, []);

  return (
    <FlowContext.Provider value={{ dataset, rows, selection, setDataset, setSelection, reset }}>
      {children}
    </FlowContext.Provider>
  );
}

export function useFlow() {
  const ctx = useContext(FlowContext);
  if (!ctx) throw new Error("useFlow must be used within FlowProvider");
  return ctx;
}
