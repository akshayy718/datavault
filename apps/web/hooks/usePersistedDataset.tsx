"use client";
/**
 * Persists the last uploaded dataset to localStorage so navigating away
 * (back button, switching tabs) doesn't lose the upload state.
 *
 * Stores only the dataset ID and metadata — NOT the full row data.
 * On restore, it fetches fresh rows from the backend, which guarantees
 * the data is current (not stale from hours ago) and avoids storing
 * potentially large CSV data in localStorage.
 */
import { useState, useEffect, useCallback } from "react";
import { datasets as datasetsApi, Dataset, DatasetRow } from "@/lib/api";

const STORAGE_KEY = "dv_last_dataset";

interface StoredDataset {
  id: string;
  original_filename: string;
  schema_definition: { column_name: string; data_type: string }[];
  row_count: number;
  created_at: string;
  saved_at: number; // timestamp so we can expire old ones
}

interface RestoredState {
  dataset: Dataset;
  columns: string[];
  rows: Record<string, string>[];
}

export function usePersistDataset() {
  const [restoring, setRestoring] = useState(false);

  function save(dataset: Dataset) {
    try {
      const stored: StoredDataset = {
        id: dataset.id,
        original_filename: dataset.original_filename,
        schema_definition: dataset.schema_definition,
        row_count: dataset.row_count,
        created_at: dataset.created_at,
        saved_at: Date.now(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    } catch {
      // localStorage unavailable (private mode, etc.) — silently skip
    }
  }

  function clear() {
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  }

  function getSaved(): StoredDataset | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const stored: StoredDataset = JSON.parse(raw);
      // Expire after 24 hours — stale dataset IDs may no longer exist on server
      if (Date.now() - stored.saved_at > 24 * 60 * 60 * 1000) {
        clear();
        return null;
      }
      return stored;
    } catch {
      return null;
    }
  }

  const restore = useCallback(async (): Promise<RestoredState | null> => {
    const stored = getSaved();
    if (!stored) return null;
    setRestoring(true);
    try {
      const rowsRes = await datasetsApi.getRows(stored.id);
      const cols = stored.schema_definition.map(c => c.column_name);
      const rows = rowsRes.data.map(r => r.row_data as Record<string, string>);
      const dataset: Dataset = {
        id: stored.id,
        original_filename: stored.original_filename,
        schema_definition: stored.schema_definition,
        row_count: stored.row_count,
        created_at: stored.created_at,
      };
      return { dataset, columns: cols, rows };
    } catch {
      // Dataset no longer exists on server (deleted, new DB, etc.) — clear stale entry
      clear();
      return null;
    } finally {
      setRestoring(false);
    }
  }, []);

  return { save, clear, getSaved, restore, restoring };
}
