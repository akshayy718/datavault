"use client";
import { motion } from "framer-motion";
import { FileSpreadsheet, AlignJustify, Columns, MousePointer2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

interface SummaryPanelProps {
  fileName: string;
  rowCount: number;
  colCount: number;
  selectedCount: number;
  selectionMode: string;
  canContinue: boolean;
  onContinue: () => void;
}

const STAT_ICONS = {
  file: FileSpreadsheet,
  rows: AlignJustify,
  cols: Columns,
  selected: MousePointer2,
};

export function SummaryPanel({
  fileName, rowCount, colCount, selectedCount, selectionMode, canContinue, onContinue,
}: SummaryPanelProps) {
  const stats = [
    { icon: FileSpreadsheet, label: "File", value: fileName, mono: false },
    { icon: AlignJustify, label: "Rows", value: rowCount.toLocaleString(), mono: true },
    { icon: Columns, label: "Columns", value: colCount.toString(), mono: true },
    { icon: MousePointer2, label: "Selected", value: selectedCount.toString(), mono: true, accent: selectedCount > 0 },
  ];

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs font-medium text-[#9CA3AF] uppercase tracking-wider">Summary</p>

      <div className="space-y-2">
        {stats.map(s => (
          <div key={s.label} className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">
            <div className="flex items-center gap-2">
              <s.icon className="h-3.5 w-3.5 text-[#9CA3AF]" />
              <span className="text-xs text-[#9CA3AF]">{s.label}</span>
            </div>
            <span
              className={cn(
                "text-xs font-medium max-w-[140px] truncate text-right",
                s.mono && "font-['Space_Grotesk']",
                s.accent && selectedCount > 0 ? "text-[#00E6A7]" : "text-white"
              )}
            >
              {s.value}
            </span>
          </div>
        ))}
      </div>

      {/* Selection mode badge */}
      {selectedCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-[#00E6A7]/20 bg-[#00E6A7]/5 px-3 py-2.5"
        >
          <p className="text-xs text-[#9CA3AF]">Selection mode</p>
          <p className="text-sm font-medium text-[#00E6A7] capitalize mt-0.5">{selectionMode}</p>
          <p className="text-xs text-[#9CA3AF] mt-1">
            {selectedCount} {selectionMode === "row" ? "row" : selectionMode === "column" ? "column" : "item"}
            {selectedCount !== 1 ? "s" : ""} selected
          </p>
        </motion.div>
      )}

      {/* Empty state */}
      {selectedCount === 0 && (
        <p className="text-xs text-[#9CA3AF] text-center py-2">
          Click rows, columns, or cells to select data
        </p>
      )}

      {/* CTA */}
      <Button
        size="lg"
        onClick={onContinue}
        disabled={!canContinue}
        className={cn(
          "w-full gap-2 mt-2",
          !canContinue && "opacity-30"
        )}
      >
        Create Share
        <ArrowRight className="h-4 w-4" />
      </Button>

      {canContinue && (
        <p className="text-xs text-[#9CA3AF] text-center -mt-1">
          You&apos;ll configure sharing options next
        </p>
      )}
    </div>
  );
}
