"use client";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface SelectionCardProps {
  index: number;
  row: Record<string, string>;
  columns: string[];
  selected: boolean;
  highlighted: boolean;
  selectionMode: string;
  selectedCols: Set<string>;
  selectedCell: { row: number; col: string } | null;
  rowIndex: number;
  onClick: () => void;
  onCellClick: (col: string) => void;
}

export function SelectionCard({
  index, row, columns, selected, highlighted,
  selectionMode, selectedCols, selectedCell, rowIndex,
  onClick, onCellClick,
}: SelectionCardProps) {
  const nameCol = columns.find(c => c.toLowerCase() === "name") ?? columns[0];
  const titleCol = columns.find(c => c.toLowerCase() === "title");
  const deptCol = columns.find(c => c.toLowerCase() === "department");
  const emailCol = columns.find(c => c.toLowerCase() === "email");
  const photoCol = columns.find(c => c.toLowerCase() === "photo");

  const initials = (row[nameCol] ?? "?")
    .split(" ")
    .map((w: string) => w[0])
    .slice(0, 2)
    .join("");

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      onClick={selectionMode === "row" ? onClick : undefined}
      className={cn(
        "relative rounded-2xl border transition-all duration-200",
        selectionMode === "row" ? "cursor-pointer" : "cursor-default",
        selected
          ? "border-[#00E6A7]/40 bg-[#00E6A7]/5"
          : highlighted
          ? "border-white/15 bg-white/[0.03]"
          : "border-white/[0.06] bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.035]"
      )}
    >
      {/* Selected indicator */}
      {selected && (
        <div className="absolute top-3 right-3 flex h-5 w-5 items-center justify-center rounded-full bg-[#00E6A7]">
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
            <path d="M1 4L3.5 6.5L9 1" stroke="#08090A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      )}

      <div className="p-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          {photoCol && row[photoCol]?.startsWith("http") ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={row[photoCol]} alt="" className="h-10 w-10 rounded-xl object-cover shrink-0" />
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#00E6A7]/20 text-xs font-semibold text-[#00E6A7]">
              {initials}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">{row[nameCol]}</p>
            {titleCol && <p className="text-xs text-[#9CA3AF] truncate">{row[titleCol]}</p>}
          </div>
        </div>

        {/* Fields */}
        <div className="space-y-2">
          {columns
            .filter(c => c !== nameCol && c !== titleCol && c !== photoCol)
            .slice(0, 3)
            .map(col => {
              const isCellSel = selectionMode === "cell" && selectedCell?.row === rowIndex && selectedCell?.col === col;
              const isColSel = selectionMode === "column" && selectedCols.has(col);
              const fieldSelected = isCellSel || isColSel;

              return (
                <div
                  key={col}
                  onClick={e => {
                    if (selectionMode === "cell" || selectionMode === "column") {
                      e.stopPropagation();
                      onCellClick(col);
                    }
                  }}
                  className={cn(
                    "flex items-center justify-between rounded-lg px-3 py-2 transition-all duration-150",
                    (selectionMode === "cell" || selectionMode === "column") && "cursor-pointer",
                    fieldSelected
                      ? "bg-[#00E6A7]/12 border border-[#00E6A7]/30"
                      : "bg-white/[0.02] border border-transparent hover:bg-white/[0.04]"
                  )}
                >
                  <span className="text-xs text-[#9CA3AF] shrink-0">{col}</span>
                  <span className={cn("text-xs ml-2 truncate text-right max-w-[120px]", fieldSelected ? "text-[#00E6A7]" : "text-white/70")}>
                    {row[col] || "—"}
                  </span>
                </div>
              );
            })}
        </div>
      </div>
    </motion.div>
  );
}
