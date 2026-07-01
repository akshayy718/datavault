"use client";
import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { DropZone } from "@/components/upload/DropZone";
import { DataPreview, SelectionMode } from "@/components/upload/DataPreview";
import { AIPanel } from "@/components/upload/AIPanel";
import { SummaryPanel } from "@/components/upload/SummaryPanel";

type UploadState = "idle" | "uploading" | "done" | "error";

interface ParsedData {
  fileName: string;
  columns: string[];
  rows: Record<string, string>[];
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
  mode: "row",
  rows: new Set(),
  cols: new Set(),
  cell: null,
  rangeStart: null,
  rangeEnd: null,
};

function parseCSV(text: string): { columns: string[]; rows: Record<string, string>[] } {
  const lines = text.trim().split("\n");
  const columns = lines[0].split(",").map(c => c.trim().replace(/^"|"$/g, ""));
  const rows = lines.slice(1).map(line => {
    const vals = line.split(",").map(v => v.trim().replace(/^"|"$/g, ""));
    return Object.fromEntries(columns.map((c, i) => [c, vals[i] ?? ""]));
  });
  return { columns, rows };
}

export default function DashboardPage() {
  const router = useRouter();
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [progress, setProgress] = useState(0);
  const [parsed, setParsed] = useState<ParsedData | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [selMode, setSelMode] = useState<SelectionMode>("row");
  const [selection, setSelection] = useState<Selection>(DEFAULT_SELECTION);

  const handleFile = useCallback(async (file: File) => {
    setUploadState("uploading");
    setProgress(0);
    setParsed(null);
    setSelection(DEFAULT_SELECTION);

    // Simulate progress
    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= 85) { clearInterval(interval); return p; }
        return p + Math.random() * 18;
      });
    }, 80);

    try {
      const text = await file.text();
      await new Promise(r => setTimeout(r, 700));
      clearInterval(interval);
      setProgress(100);
      await new Promise(r => setTimeout(r, 200));

      const { columns, rows } = parseCSV(text);
      setParsed({ fileName: file.name, columns, rows });
      setUploadState("done");
    } catch (e) {
      clearInterval(interval);
      setErrorMsg("Could not parse file. Please check it's a valid CSV.");
      setUploadState("error");
    }
  }, []);

  function countSelected(): number {
    if (selMode === "row") return selection.rows.size;
    if (selMode === "column") return selection.cols.size;
    if (selMode === "cell") return selection.cell ? 1 : 0;
    if (selMode === "range" && selection.rangeStart && selection.rangeEnd) {
      const rows = Math.abs(selection.rangeStart.row - selection.rangeEnd.row) + 1;
      const ci = parsed?.columns ?? [];
      const c1 = ci.indexOf(selection.rangeStart.col);
      const c2 = ci.indexOf(selection.rangeEnd.col);
      return rows * (Math.abs(c1 - c2) + 1);
    }
    return 0;
  }

  const selectedCount = countSelected();
  const canContinue = selectedCount > 0;

  function handleContinue() {
    // Store selection in sessionStorage for next screen
    if (!parsed) return;
    sessionStorage.setItem("dv_dataset", JSON.stringify({ fileName: parsed.fileName, columns: parsed.columns }));
    router.push("/share");
  }

  return (
    <div className="min-h-screen bg-[#08090A] flex flex-col">
      <Navbar />

      <main className="flex-1 flex flex-col">
        <AnimatePresence mode="wait">
          {/* Upload state */}
          {uploadState !== "done" && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-1 flex-col items-center justify-center px-6 py-16"
            >
              {/* Page heading */}
              <div className="text-center mb-12">
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-xs font-medium text-[#00E6A7] uppercase tracking-widest mb-3"
                >
                  Step 1 of 3
                </motion.p>
                <motion.h1
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="font-['Inter_Tight'] text-3xl font-bold text-white"
                >
                  Upload your data
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.15 }}
                  className="mt-2 text-[#9CA3AF] text-sm"
                >
                  We&apos;ll help you select what to share
                </motion.p>
              </div>

              <DropZone
                onFile={handleFile}
                state={uploadState}
                progress={Math.min(progress, 100)}
                fileName={parsed?.fileName}
                errorMessage={errorMsg}
              />
            </motion.div>
          )}

          {/* Preview + select state */}
          {uploadState === "done" && parsed && (
            <motion.div
              key="preview"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-1 overflow-hidden"
            >
              {/* Main content */}
              <div className="flex flex-1 flex-col overflow-hidden px-6 py-6 gap-4">
                {/* Breadcrumb */}
                <div className="flex items-center gap-2 text-xs text-[#9CA3AF]">
                  <span className="text-[#00E6A7]">Upload</span>
                  <span>/</span>
                  <span className="text-white font-medium">{parsed.fileName}</span>
                  <span className="ml-auto font-['Space_Grotesk'] text-[#9CA3AF]">
                    {parsed.rows.length} rows × {parsed.columns.length} cols
                  </span>
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
              <div className="w-72 shrink-0 border-l border-white/[0.06] flex flex-col gap-6 overflow-y-auto px-5 py-6">
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
                    rowCount={parsed.rows.length}
                    onSuggest={rowIndices => {
                      setSelMode("row");
                      setSelection({ ...DEFAULT_SELECTION, mode: "row", rows: new Set(rowIndices) });
                    }}
                    onFilter={query => {
                      // Highlight rows matching query against any column
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
