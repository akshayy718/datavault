"use client";
import { motion } from "framer-motion";
import { Rows3, AlignJustify, Square, Grid2X2, Filter } from "lucide-react";
import { cn } from "@/lib/utils";

export type SelectMode = "row" | "column" | "cell" | "range" | "filter";

const MODES = [
  { key: "row" as SelectMode, icon: AlignJustify, label: "Row", desc: "Select full rows" },
  { key: "column" as SelectMode, icon: Rows3, label: "Column", desc: "Select entire column" },
  { key: "cell" as SelectMode, icon: Square, label: "Cell", desc: "Select single cell" },
  { key: "range" as SelectMode, icon: Grid2X2, label: "Range", desc: "Select a range" },
  { key: "filter" as SelectMode, icon: Filter, label: "Filter", desc: "Filter by condition" },
];

interface SelectionModeBarProps {
  mode: SelectMode;
  onChange: (m: SelectMode) => void;
  count: number;
}

export function SelectionModeBar({ mode, onChange, count }: SelectionModeBarProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1 rounded-xl bg-white/[0.03] border border-white/[0.06] p-1">
        {MODES.map(m => (
          <button
            key={m.key}
            onClick={() => onChange(m.key)}
            title={m.desc}
            className={cn(
              "relative flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-200",
              mode === m.key ? "text-[#08090A]" : "text-[#9CA3AF] hover:text-white"
            )}
          >
            {mode === m.key && (
              <motion.div
                layoutId="sel-mode"
                className="absolute inset-0 rounded-lg bg-[#00E6A7]"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <m.icon className="relative h-3.5 w-3.5" />
            <span className="relative">{m.label}</span>
          </button>
        ))}
      </div>

      {count > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-1.5 rounded-lg border border-[#00E6A7]/30 bg-[#00E6A7]/10 px-3 py-1.5"
        >
          <div className="h-1.5 w-1.5 rounded-full bg-[#00E6A7] animate-pulse" />
          <span className="text-xs font-medium text-[#00E6A7]">{count} selected</span>
        </motion.div>
      )}
    </div>
  );
}
