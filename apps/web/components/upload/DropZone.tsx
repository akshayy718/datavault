"use client";
import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, FileSpreadsheet, X, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface DropZoneProps {
  onFile: (file: File) => void;
  state: "idle" | "uploading" | "done" | "error";
  progress: number;
  fileName?: string;
  errorMessage?: string;
}

const RECENT = [
  { name: "employees.csv", rows: 8, date: "Today" },
  { name: "sales_q2.xlsx", rows: 1240, date: "Yesterday" },
  { name: "customers.csv", rows: 342, date: "Jun 28" },
];

export function DropZone({ onFile, state, progress, fileName, errorMessage }: DropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) onFile(file);
  }

  return (
    <div className="flex flex-col items-center w-full max-w-2xl mx-auto">
      {/* Main drop area */}
      <motion.div
        animate={dragging ? { scale: 1.01 } : { scale: 1 }}
        transition={{ duration: 0.2 }}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className="relative w-full"
      >
        <div
          className="relative w-full rounded-2xl border-2 border-dashed transition-all duration-300 overflow-hidden"
          style={{
            borderColor: dragging ? "#00E6A7" : state === "error" ? "rgba(239,68,68,0.4)" : "rgba(255,255,255,0.1)",
            background: dragging ? "rgba(0,230,167,0.03)" : "rgba(255,255,255,0.01)",
          }}
        >
          <AnimatePresence mode="wait">
            {/* Idle */}
            {state === "idle" && (
              <motion.div
                key="idle"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-16 px-8 text-center"
              >
                <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[0.03] border border-white/[0.07]">
                  <Upload className="h-7 w-7 text-[#9CA3AF]" />
                </div>
                <h3 className="font-['Inter_Tight'] text-xl font-semibold text-white mb-2">
                  Drop your spreadsheet here
                </h3>
                <p className="text-sm text-[#9CA3AF] mb-6">
                  Supports .csv and .xlsx files up to 50MB
                </p>
                <Button
                  variant="outline"
                  size="md"
                  onClick={() => inputRef.current?.click()}
                  className="gap-2"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Choose file
                </Button>
              </motion.div>
            )}

            {/* Uploading */}
            {state === "uploading" && (
              <motion.div
                key="uploading"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-16 px-8 text-center"
              >
                <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#00E6A7]/10">
                  <FileSpreadsheet className="h-7 w-7 text-[#00E6A7]" />
                </div>
                <p className="text-sm font-medium text-white mb-1">{fileName}</p>
                <p className="text-xs text-[#9CA3AF] mb-6">Parsing rows...</p>
                {/* Progress bar */}
                <div className="w-full max-w-xs">
                  <div className="h-1 w-full rounded-full bg-white/10 overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-[#00E6A7]"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.4, ease: "easeOut" }}
                    />
                  </div>
                  <p className="mt-2 text-right text-xs text-[#9CA3AF] font-['Space_Grotesk']">{progress}%</p>
                </div>
              </motion.div>
            )}

            {/* Done */}
            {state === "done" && (
              <motion.div
                key="done"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex items-center justify-between px-6 py-5"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#00E6A7]/10">
                    <CheckCircle2 className="h-5 w-5 text-[#00E6A7]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{fileName}</p>
                    <p className="text-xs text-[#9CA3AF]">Ready to preview</p>
                  </div>
                </div>
                <button
                  onClick={() => inputRef.current?.click()}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-[#9CA3AF] hover:bg-white/5 hover:text-white transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </motion.div>
            )}

            {/* Error */}
            {state === "error" && (
              <motion.div
                key="error"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-12 px-8 text-center"
              >
                <p className="text-sm text-red-400 mb-3">{errorMessage || "Upload failed"}</p>
                <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
                  Try again
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      <input
        ref={inputRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        className="hidden"
        onChange={handleChange}
      />

      {/* Demo data option */}
      <div className="mt-4 flex items-center gap-3">
        <div className="h-px flex-1 bg-white/[0.06]" />
        <span className="text-xs text-[#9CA3AF]">or use demo data</span>
        <div className="h-px flex-1 bg-white/[0.06]" />
      </div>

      <button
        onClick={() => {
          const demoFile = new File(
            ["Name,Department,Email,Photo,Title\nAisha Rahman,Engineering,aisha.rahman@example.com,https://i.pravatar.cc/150?img=1,Senior Engineer\nDaniel Okoro,Sales,daniel.okoro@example.com,https://i.pravatar.cc/150?img=2,Account Executive\nMei Lin,Engineering,mei.lin@example.com,https://i.pravatar.cc/150?img=3,Staff Engineer\nCarlos Rivera,Design,carlos.rivera@example.com,https://i.pravatar.cc/150?img=4,Product Designer\nPriya Nair,Engineering,priya.nair@example.com,https://i.pravatar.cc/150?img=7,Engineering Manager\nSamuel Green,Marketing,samuel.green@example.com,https://i.pravatar.cc/150?img=8,Growth Lead\nFatima Al-Zahra,HR,fatima@example.com,https://i.pravatar.cc/150?img=9,People Ops\nTomás Herrera,Sales,tomas@example.com,https://i.pravatar.cc/150?img=10,Sales Director"],
            "employees.csv",
            { type: "text/csv" }
          );
          onFile(demoFile);
        }}
        className="mt-3 text-sm text-[#00E6A7] hover:text-[#00E6A7]/80 transition-colors font-medium"
      >
        Load employees.csv demo
      </button>

      {/* Recent uploads */}
      {state === "idle" && (
        <div className="mt-8 w-full">
          <p className="text-xs font-medium text-[#9CA3AF] mb-3 uppercase tracking-wider">Recent uploads</p>
          <div className="space-y-2">
            {RECENT.map(f => (
              <button
                key={f.name}
                className="flex w-full items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.01] px-4 py-3 text-left hover:bg-white/[0.04] hover:border-white/10 transition-all duration-200"
              >
                <FileSpreadsheet className="h-4 w-4 text-[#9CA3AF] shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{f.name}</p>
                  <p className="text-xs text-[#9CA3AF]">{f.rows.toLocaleString()} rows</p>
                </div>
                <span className="text-xs text-[#9CA3AF] shrink-0">{f.date}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
