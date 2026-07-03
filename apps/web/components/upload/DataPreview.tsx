"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export type SelectionMode = "row" | "column" | "cell" | "range";

interface Selection {
  mode: SelectionMode;
  rows: Set<number>;
  cols: Set<string>;
  cell: { row: number; col: string } | null;
  rangeStart: { row: number; col: string } | null;
  rangeEnd: { row: number; col: string } | null;
}

interface DataPreviewProps {
  columns: string[];
  rows: Record<string, string>[];
  selection: Selection;
  onSelectionChange: (sel: Selection) => void;
  mode: SelectionMode;
  onModeChange: (m: SelectionMode) => void;
}

const MODES: { key: SelectionMode; label: string; hint: string }[] = [
  { key: "row",    label: "Row",    hint: "Click a row number (#) or any cell to select full rows." },
  { key: "column", label: "Column", hint: "Click a column header to select the entire column." },
  { key: "cell",   label: "Cell",   hint: "Click any individual cell to select it." },
  { key: "range",  label: "Range",  hint: "Click a start cell, then an end cell to select a rectangular range." },
];

export function DataPreview({ columns, rows, selection, onSelectionChange, mode, onModeChange }: DataPreviewProps) {
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [hoveredCol, setHoveredCol] = useState<string | null>(null);

  const currentHint = MODES.find(m => m.key === mode)?.hint ?? "";

  function handleRowClick(rowIdx: number) {
    // Row mode: clicking the row number or any cell in the row toggles the row.
    const next = new Set(selection.rows);
    next.has(rowIdx) ? next.delete(rowIdx) : next.add(rowIdx);
    onSelectionChange({ ...selection, rows: next, cols: new Set(), cell: null });
  }

  function handleCellClick(rowIdx: number, col: string) {
    if (mode === "row") {
      handleRowClick(rowIdx);
    } else if (mode === "column") {
      const next = new Set(selection.cols);
      next.has(col) ? next.delete(col) : next.add(col);
      onSelectionChange({ ...selection, cols: next, rows: new Set(), cell: null });
    } else if (mode === "cell") {
      // Toggle off if clicking the same cell again
      if (selection.cell?.row === rowIdx && selection.cell?.col === col) {
        onSelectionChange({ ...selection, cell: null, rows: new Set(), cols: new Set() });
      } else {
        onSelectionChange({ ...selection, cell: { row: rowIdx, col }, rows: new Set(), cols: new Set() });
      }
    } else if (mode === "range") {
      if (!selection.rangeStart) {
        onSelectionChange({ ...selection, rangeStart: { row: rowIdx, col }, rangeEnd: null });
      } else if (!selection.rangeEnd) {
        onSelectionChange({ ...selection, rangeEnd: { row: rowIdx, col } });
      } else {
        // Third click: restart range from new start
        onSelectionChange({ ...selection, rangeStart: { row: rowIdx, col }, rangeEnd: null });
      }
    }
  }

  function isCellSelected(rowIdx: number, col: string): boolean {
    if (mode === "row" && selection.rows.has(rowIdx)) return true;
    if (mode === "column" && selection.cols.has(col)) return true;
    if (mode === "cell" && selection.cell?.row === rowIdx && selection.cell?.col === col) return true;
    if (mode === "range" && selection.rangeStart && selection.rangeEnd) {
      const minR = Math.min(selection.rangeStart.row, selection.rangeEnd.row);
      const maxR = Math.max(selection.rangeStart.row, selection.rangeEnd.row);
      const ci = columns.indexOf(col);
      const c1 = columns.indexOf(selection.rangeStart.col);
      const c2 = columns.indexOf(selection.rangeEnd.col);
      return rowIdx >= minR && rowIdx <= maxR && ci >= Math.min(c1, c2) && ci <= Math.max(c1, c2);
    }
    // Highlight the start cell of an incomplete range
    if (mode === "range" && selection.rangeStart && !selection.rangeEnd) {
      return selection.rangeStart.row === rowIdx && selection.rangeStart.col === col;
    }
    return false;
  }

  function isRowSelected(rowIdx: number): boolean {
    return mode === "row" && selection.rows.has(rowIdx);
  }

  function isRowHovered(rowIdx: number): boolean {
    return (mode === "row" || mode === "cell" || mode === "range") && hoveredRow === rowIdx && !isRowSelected(rowIdx);
  }

  return (
    <div className="flex flex-col h-full gap-3">
      {/* Mode selector + hint */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/[0.06] self-start">
          {MODES.map(m => (
            <button
              key={m.key}
              onClick={() => {
                onModeChange(m.key);
                onSelectionChange({ mode: m.key, rows: new Set(), cols: new Set(), cell: null, rangeStart: null, rangeEnd: null });
              }}
              className={cn(
                "relative px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-200",
                mode === m.key ? "text-[#08090A]" : "text-[#9CA3AF] hover:text-white"
              )}
            >
              {mode === m.key && (
                <motion.div
                  layoutId="mode-pill"
                  className="absolute inset-0 rounded-lg bg-[#00E6A7]"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative">{m.label}</span>
            </button>
          ))}
        </div>
        {/* Mode-specific hint text */}
        <p className="text-xs text-[#9CA3AF] pl-1">{currentHint}</p>
        {/* Range partial state hint */}
        {mode === "range" && selection.rangeStart && !selection.rangeEnd && (
          <p className="text-xs text-[#00E6A7] pl-1 animate-pulse">
            Start selected — now click an end cell to complete the range.
          </p>
        )}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto rounded-xl border border-white/[0.06] bg-white/[0.01]">
        <table className="w-full text-sm border-collapse">
          <thead className="sticky top-0 z-10">
            <tr>
              {/* Row number header */}
              <th className="w-10 border-b border-white/[0.06] bg-[#0E0F11] px-3 py-3 text-left text-xs font-medium text-[#9CA3AF] select-none">
                #
              </th>
              {columns.map(col => (
                <th
                  key={col}
                  onClick={() => mode === "column" && handleCellClick(0, col)}
                  onMouseEnter={() => setHoveredCol(col)}
                  onMouseLeave={() => setHoveredCol(null)}
                  className={cn(
                    "border-b border-white/[0.06] bg-[#0E0F11] px-4 py-3 text-left text-xs font-medium tracking-wide transition-colors duration-150 whitespace-nowrap select-none",
                    mode === "column" ? "cursor-pointer" : "cursor-default",
                    selection.cols.has(col)
                      ? "text-[#00E6A7] bg-[#00E6A7]/10"
                      : mode === "column" && hoveredCol === col
                      ? "text-white bg-white/5"
                      : "text-[#9CA3AF]"
                  )}
                >
                  {col}
                  {mode === "column" && !selection.cols.has(col) && (
                    <span className="ml-1 text-[#9CA3AF]/40 font-normal">↓</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rIdx) => (
              <tr
                key={rIdx}
                onMouseEnter={() => setHoveredRow(rIdx)}
                onMouseLeave={() => setHoveredRow(null)}
                className={cn(
                  "border-b border-white/[0.04] transition-colors duration-100",
                  isRowSelected(rIdx) ? "bg-[#00E6A7]/8" : isRowHovered(rIdx) ? "bg-white/[0.025]" : ""
                )}
              >
                {/* Row number — clickable in row mode */}
                <td
                  onClick={() => mode === "row" && handleRowClick(rIdx)}
                  className={cn(
                    "px-3 py-3 text-xs font-['Space_Grotesk'] select-none transition-colors",
                    mode === "row"
                      ? "cursor-pointer text-[#9CA3AF] hover:text-[#00E6A7]"
                      : "text-[#9CA3AF]/50 cursor-default",
                    isRowSelected(rIdx) && "text-[#00E6A7] font-semibold"
                  )}
                >
                  {rIdx + 1}
                </td>
                {columns.map(col => {
                  const selected = isCellSelected(rIdx, col);
                  const isPhoto = col.toLowerCase() === "photo" && row[col]?.startsWith("http");
                  return (
                    <td
                      key={col}
                      onClick={() => handleCellClick(rIdx, col)}
                      className={cn(
                        "px-4 py-3 transition-colors duration-100 whitespace-nowrap",
                        "cursor-pointer",
                        selected
                          ? "bg-[#00E6A7]/12 text-[#00E6A7]"
                          : "text-white/80"
                      )}
                    >
                      {isPhoto ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={row[col]} alt="" className="h-7 w-7 rounded-full object-cover" />
                      ) : (
                        <span className="text-sm">{row[col] || "—"}</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
