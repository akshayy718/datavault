"use client";
import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useFlow } from "@/hooks/useFlow";
import { useToast } from "@/components/ui/Toast";
import { usePersistDataset } from "@/hooks/usePersistedDataset";
import { datasets as datasetsApi, Dataset } from "@/lib/api";
import { DropZone } from "@/components/upload/DropZone";
import { DataPreview, SelectionMode } from "@/components/upload/DataPreview";
import { AIPanel } from "@/components/upload/AIPanel";
import { SummaryPanel } from "@/components/upload/SummaryPanel";

type UploadState = "idle" | "restoring" | "uploading" | "done" | "error";

interface ParsedData {
  fileName: string;
  columns: string[];
  rows: Record<string, string>[];
  datasetId: string | null;
}

interface Selection {
  mode: SelectionMode;
  rows: Set<number>;
  cols: Set<string>;
  cell: { row: number; col: string } | null;
  rangeStart: { row: number; col: string } | null;
  rangeEnd: { row: number; col: string } | null;
}

const DEFAULT_SELECTION: Selection = {
  mode: "row", rows: new Set(), cols: new Set(), cell: null, rangeStart: null, rangeEnd: null,
};

function parseCSV(text: string): { columns: string[]; rows: Record<string, string>[] } {
  const lines = text.trim().split("\n");
  const columns = lines[0].split(",").map(c => c.trim().replace(/^"|"$/g, ""));
  const rows = lines.slice(1).filter(l => l.trim()).map(line => {
    const vals = line.split(",").map(v => v.trim().replace(/^"|"$/g, ""));
    return Object.fromEntries(columns.map((c, i) => [c, vals[i] ?? ""]));
  });
  return { columns, rows };
}

export default function DashboardPage() {
  const { user, loading } = useRequireAuth();
  const router = useRouter();
  const { setDataset: setFlowDataset, setSelection: setFlowSelection } = useFlow();
  const toast = useToast();
  const persist = usePersistDataset();

  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [progress, setProgress] = useState(0);
  const [parsed, setParsed] = useState<ParsedData | null>(null);
  const [selMode, setSelMode] = useState<SelectionMode>("row");
  const [selection, setSelection] = useState<Selection>(DEFAULT_SELECTION);

  // ── Restore last dataset on mount ───────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const saved = persist.getSaved();
    if (!saved) return;

    setUploadState("restoring");
    persist.restore().then(result => {
      if (result) {
        setParsed({
          fileName: result.dataset.original_filename,
          columns: result.columns,
          rows: result.rows,
          datasetId: result.dataset.id,
        });
        setFlowDataset(result.dataset, result.rows.map((row_data, i) => ({
          id: String(i), dataset_id: result.dataset.id, row_index: i, row_data,
        })));
        setUploadState("done");
        toast.success(`Restored "${result.dataset.original_filename}" from your last session.`);
      } else {
        setUploadState("idle");
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // ── Upload handler ────────────────────────────────────────────────────────────
  const handleFile = useCallback(async (file: File) => {
    setUploadState("uploading");
    setProgress(0);
    setParsed(null);
    setSelection(DEFAULT_SELECTION);

    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= 85) { clearInterval(interval); return p; }
        return p + Math.random() * 18;
      });
    }, 80);

    try {
      const text = await file.text();
      const localParsed = parseCSV(text);

      try {
        const res = await datasetsApi.upload(file);
        const rowsRes = await datasetsApi.getRows(res.data.id);
        const cols = res.data.schema_definition.map(c => c.column_name);
        const rows = rowsRes.data.map(r => r.row_data as Record<string, string>);

        clearInterval(interval);
        setProgress(100);
        await new Promise(r => setTimeout(r, 200));

        const newParsed: ParsedData = {
          fileName: res.data.original_filename,
          columns: cols,
          rows,
          datasetId: res.data.id,
        };
        setParsed(newParsed);
        setFlowDataset(res.data, rowsRes.data);
        persist.save(res.data);
        setUploadState("done");
        toast.success(`"${res.data.original_filename}" uploaded — ${rows.length} rows ready.`);
      } catch (apiErr) {
        // Backend unreachable — use local preview, no real share possible
        clearInterval(interval);
        setProgress(100);
        await new Promise(r => setTimeout(r, 200));
        setParsed({ fileName: file.name, columns: localParsed.columns, rows: localParsed.rows, datasetId: null });
        setUploadState("done");
        toast.warning("Preview loaded locally. Connect to the backend to create real shares.");
      }
    } catch {
      clearInterval(interval);
      setUploadState("error");
      toast.error("Could not read file. Please check it's a valid CSV or XLSX.");
    }
  }, [setFlowDataset, persist, toast]);

  // ── Selection count ──────────────────────────────────────────────────────────
  function countSelected(): number {
    if (selMode === "row") return selection.rows.size;
    if (selMode === "column") return selection.cols.size;
    if (selMode === "cell") return selection.cell ? 1 : 0;
    if (selMode === "range" && selection.rangeStart && selection.rangeEnd) {
      const r = Math.abs(selection.rangeStart.row - selection.rangeEnd.row) + 1;
      const ci = parsed?.columns ?? [];
      const c1 = ci.indexOf(selection.rangeStart.col);
      const c2 = ci.indexOf(selection.rangeEnd.col);
      return r * (Math.abs(c1 - c2) + 1);
    }
    return 0;
  }

  const selectedCount = countSelected();
  const canContinue = selectedCount > 0 && Boolean(parsed?.datasetId);

  // ── Build selection spec (matches backend contract exactly) ──────────────────
  function buildSelectionSpec(): {
    type: "row" | "column" | "cell" | "range" | "filter";
    spec: Record<string, unknown>;
    previewRows: Record<string, string>[];
  } | null {
    if (!parsed) return null;

    if (selMode === "row" && selection.rows.size > 0) {
      const indices = Array.from(selection.rows).sort((a, b) => a - b);
      if (indices.length === 1) {
        return { type: "row", spec: { row_index: indices[0] }, previewRows: [parsed.rows[indices[0]]].filter(Boolean) };
      }
      // Multiple rows → backend "range" type with row_indices array
      return { type: "range", spec: { row_indices: indices }, previewRows: indices.map(i => parsed.rows[i]).filter(Boolean) };
    }

    if (selMode === "column" && selection.cols.size > 0) {
      const cols = Array.from(selection.cols);
      // Send ALL selected columns (not just the first). The backend's "column"
      // type now accepts a "columns" array and returns every selected column
      // for every row. previewRows keeps only those columns so the share-page
      // preview matches what the recipient will see.
      const previewRows = parsed.rows.map(row => {
        const trimmed: Record<string, string> = {};
        cols.forEach(c => { trimmed[c] = row[c]; });
        return trimmed;
      });
      return { type: "column", spec: { columns: cols }, previewRows };
    }

    if (selMode === "cell" && selection.cell) {
      return {
        type: "cell",
        spec: { row_index: selection.cell.row, column: selection.cell.col },
        previewRows: [parsed.rows[selection.cell.row]].filter(Boolean),
      };
    }

    if (selMode === "range" && selection.rangeStart && selection.rangeEnd) {
      const lo = Math.min(selection.rangeStart.row, selection.rangeEnd.row);
      const hi = Math.max(selection.rangeStart.row, selection.rangeEnd.row);
      const indices = Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
      return { type: "range", spec: { row_indices: indices }, previewRows: indices.map(i => parsed.rows[i]).filter(Boolean) };
    }

    return null;
  }

  function handleContinue() {
    if (!parsed?.datasetId) {
      toast.error("No dataset loaded. Please upload a file first.");
      return;
    }
    const built = buildSelectionSpec();
    if (!built) {
      toast.warning("Please select at least one row, column, cell, or range first.");
      return;
    }
    setFlowSelection({ type: built.type, spec: built.spec, count: selectedCount, previewRows: built.previewRows });
    router.push("/share");
  }

  function handleClearDataset() {
    persist.clear();
    setParsed(null);
    setSelection(DEFAULT_SELECTION);
    setUploadState("idle");
    toast.success("Dataset cleared. Upload a new file to start over.");
  }

  // ── Auth guard ───────────────────────────────────────────────────────────────
  if (loading || !user) {
    return (
      <div className="min-h-screen bg-[#08090A] flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-[#00E6A7]/20 border-t-[#00E6A7] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#08090A] flex flex-col">
      <Navbar />
      <main className="flex-1 flex flex-col">
        <AnimatePresence mode="wait">

          {/* Restoring state */}
          {uploadState === "restoring" && (
            <motion.div
              key="restoring"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex flex-1 flex-col items-center justify-center gap-4"
            >
              <div className="h-8 w-8 rounded-full border-2 border-[#00E6A7]/20 border-t-[#00E6A7] animate-spin" />
              <p className="text-sm text-[#9CA3AF]">Restoring your last dataset…</p>
            </motion.div>
          )}

          {/* Upload / idle / error */}
          {(uploadState === "idle" || uploadState === "uploading" || uploadState === "error") && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-1 flex-col items-center justify-center px-4 sm:px-6 py-16"
            >
              <div className="text-center mb-12">
                <p className="text-xs font-medium text-[#00E6A7] uppercase tracking-widest mb-3">Step 1 of 3</p>
                <h1 className="font-['Inter_Tight'] text-3xl font-bold text-white">Upload your data</h1>
                <p className="mt-2 text-[#9CA3AF] text-sm">We&apos;ll help you select what to share</p>
              </div>
              <DropZone
                onFile={handleFile}
                state={uploadState === "error" ? "error" : uploadState === "uploading" ? "uploading" : "idle"}
                progress={Math.min(progress, 100)}
                fileName={undefined}
                errorMessage="Could not read file. Please check it's a valid CSV."
              />
            </motion.div>
          )}

          {/* Preview + select */}
          {uploadState === "done" && parsed && (
            <motion.div
              key="preview"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col lg:flex-row flex-1 overflow-y-auto lg:overflow-hidden"
            >
              {/* Main content */}
              <div className="flex flex-1 flex-col lg:overflow-hidden px-4 sm:px-6 py-6 gap-4">
                {/* Breadcrumb + clear button */}
                <div className="flex items-center gap-2 text-xs text-[#9CA3AF]">
                  <span className="text-[#00E6A7]">Upload</span>
                  <span>/</span>
                  <span className="text-white font-medium">{parsed.fileName}</span>
                  <span className="font-['Space_Grotesk'] text-[#9CA3AF]">
                    {parsed.rows.length} rows × {parsed.columns.length} cols
                  </span>
                  {!parsed.datasetId && (
                    <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-amber-400">
                      Preview only — backend offline
                    </span>
                  )}
                  <button
                    onClick={handleClearDataset}
                    className="ml-auto flex items-center gap-1.5 text-[#9CA3AF] hover:text-white transition-colors"
                    title="Upload a different file"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">New file</span>
                  </button>
                </div>

                <div className="flex-1 overflow-hidden">
                  <DataPreview
                    columns={parsed.columns}
                    rows={parsed.rows}
                    selection={selection}
                    onSelectionChange={setSelection}
                    mode={selMode}
                    onModeChange={mode => {
                      setSelMode(mode);
                      setSelection({ ...DEFAULT_SELECTION, mode });
                    }}
                  />
                </div>
              </div>

              {/* Right sidebar */}
              <div className="w-full lg:w-72 shrink-0 border-t lg:border-t-0 lg:border-l border-white/[0.06] flex flex-col gap-6 lg:overflow-y-auto px-4 sm:px-5 py-6">
                <SummaryPanel
                  fileName={parsed.fileName}
                  rowCount={parsed.rows.length}
                  colCount={parsed.columns.length}
                  selectedCount={selectedCount}
                  selectionMode={selMode}
                  canContinue={canContinue}
                  onContinue={handleContinue}
                />
                <div className="border-t border-white/[0.06] pt-6">
                  <AIPanel
                    columns={parsed.columns}
                    rows={parsed.rows}
                    onSuggest={rowIndices => {
                      setSelMode("row");
                      setSelection({ ...DEFAULT_SELECTION, mode: "row", rows: new Set(rowIndices) });
                      toast.success(`Selected ${rowIndices.length} rows.`);
                    }}
                    onFilter={query => {
                      if (!parsed) return;
                      const q = query.toLowerCase();
                      const matched = new Set(
                        parsed.rows
                          .map((row, i) => ({ row, i }))
                          .filter(({ row }) => Object.values(row).some(v => v.toLowerCase().includes(q)))
                          .map(({ i }) => i)
                      );
                      setSelMode("row");
                      setSelection({ ...DEFAULT_SELECTION, mode: "row", rows: matched });
                      if (matched.size === 0) toast.warning(`No rows match "${query}".`);
                      else toast.success(`Found ${matched.size} row${matched.size !== 1 ? "s" : ""} matching "${query}".`);
                    }}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
