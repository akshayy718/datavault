"use client";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

interface PreviewPanelProps {
  selectedRows: Record<string, string>[];
  selectedCols: string[];
  selectedCell: { col: string; value: string } | null;
  mode: string;
  onContinue: () => void;
}

export function PreviewPanel({ selectedRows, selectedCols, selectedCell, mode, onContinue }: PreviewPanelProps) {
  const count = mode === "row" ? selectedRows.length
    : mode === "column" ? selectedCols.length
    : mode === "cell" ? (selectedCell ? 1 : 0)
    : selectedRows.length;

  const hasSelection = count > 0;

  return (
    <div className="flex flex-col gap-5 h-full">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-white/5">
          <Eye className="h-3.5 w-3.5 text-[#9CA3AF]" />
        </div>
        <span className="text-sm font-medium text-white">Preview</span>
        {hasSelection && (
          <span className="ml-auto text-xs font-['Space_Grotesk'] text-[#00E6A7]">{count} item{count !== 1 ? "s" : ""}</span>
        )}
      </div>

      {/* Preview content */}
      <AnimatePresence mode="wait">
        {!hasSelection ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex flex-1 flex-col items-center justify-center text-center py-10"
          >
            <div className="mb-3 h-12 w-12 rounded-2xl border border-dashed border-white/10 flex items-center justify-center">
              <Eye className="h-5 w-5 text-[#9CA3AF]/40" />
            </div>
            <p className="text-sm text-[#9CA3AF]">Select data to preview</p>
            <p className="text-xs text-[#9CA3AF]/60 mt-1">Click rows, columns, or cells</p>
          </motion.div>
        ) : (
          <motion.div
            key="preview"
            initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex-1 space-y-3 overflow-y-auto"
          >
            {mode === "cell" && selectedCell && (
              <div className="rounded-xl border border-[#00E6A7]/20 bg-[#00E6A7]/5 p-4">
                <p className="text-xs text-[#9CA3AF] mb-1">{selectedCell.col}</p>
                <p className="text-sm font-medium text-[#00E6A7]">{selectedCell.value}</p>
              </div>
            )}

            {(mode === "row" || mode === "range" || mode === "filter") && selectedRows.slice(0, 4).map((row, i) => {
              const nameKey = Object.keys(row).find(k => k.toLowerCase() === "name") ?? Object.keys(row)[0];
              const subtitleKey = Object.keys(row).find(k => k.toLowerCase() === "title" || k.toLowerCase() === "department");
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3"
                >
                  <p className="text-sm font-medium text-white">{row[nameKey]}</p>
                  {subtitleKey && <p className="text-xs text-[#9CA3AF] mt-0.5">{row[subtitleKey]}</p>}
                </motion.div>
              );
            })}

            {mode === "column" && selectedCols.map(col => (
              <div key={col} className="rounded-xl border border-[#5BE7FF]/20 bg-[#5BE7FF]/5 p-3">
                <p className="text-xs text-[#9CA3AF] mb-1">Column</p>
                <p className="text-sm font-medium text-[#5BE7FF]">{col}</p>
              </div>
            ))}

            {selectedRows.length > 4 && (
              <p className="text-center text-xs text-[#9CA3AF]">+{selectedRows.length - 4} more rows</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* CTA */}
      <div className="pt-4 border-t border-white/[0.06]">
        <Button
          size="lg"
          onClick={onContinue}
          disabled={!hasSelection}
          className="w-full gap-2"
        >
          Configure Share
          <ArrowRight className="h-4 w-4" />
        </Button>
        {hasSelection && (
          <p className="text-xs text-[#9CA3AF] text-center mt-2">
            {count} {mode}{count !== 1 ? "s" : ""} will be shared
          </p>
        )}
      </div>
    </div>
  );
}
