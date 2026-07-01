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

const MODES: { key: SelectionMode; label: string; desc: string }[] = [
  { key: "row", label: "Row", desc: "Select full rows" },
  { key: "column", label: "Column", desc: "Select entire column" },
  { key: "cell", label: "Cell", desc: "Select single cell" },
  { key: "range", label: "Range", desc: "Select a range" },
];

export function DataPreview({ columns, rows, selection, onSelectionChange, mode, onModeChange }: DataPreviewProps) {
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [hoveredCol, setHoveredCol] = useState<string | null>(null);

  function handleCellClick(rowIdx: number, col: string) {
    if (mode === "row") {
      const next = new Set(selection.rows);
      next.has(rowIdx) ? next.delete(rowIdx) : next.add(rowIdx);
      onSelectionChange({ ...selection, rows: next, cols: new Set(), cell: null });
    } else if (mode === "column") {
      const next = new Set(selection.cols);
      next.has(col) ? next.delete(col) : next.add(col);
      onSelectionChange({ ...selection, cols: next, rows: new Set(), cell: null });
    } else if (mode === "cell") {
      onSelectionChange({ ...selection, cell: { row: rowIdx, col }, rows: new Set(), cols: new Set() });
    } else if (mode === "range") {
      if (!selection.rangeStart) {
        onSelectionChange({ ...selection, rangeStart: { row: rowIdx, col }, rangeEnd: null });
      } else {
        onSelectionChange({ ...selection, rangeEnd: { row: rowIdx, col } });
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
      const colIdxStart = columns.indexOf(selection.rangeStart.col);
      const colIdxEnd = columns.indexOf(selection.rangeEnd.col);
      const minC = Math.min(colIdxStart, colIdxEnd);
      const maxC = Math.max(colIdxStart, colIdxEnd);
      const colIdx = columns.indexOf(col);
      return rowIdx >= minR && rowIdx <= maxR && colIdx >= minC && colIdx <= maxC;
    }
    return false;
  }

  function isRowHighlighted(rowIdx: number): boolean {
    if (mode === "row" && hoveredRow === rowIdx) return true;
    return false;
  }

  function isColHighlighted(col: string): boolean {
    if (mode === "column" && hoveredCol === col) return true;
    return false;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Mode selector */}
      <div className="flex items-center gap-1 mb-4 p-1 rounded-xl bg-white/[0.03] border border-white/[0.06] self-start">
        {MODES.map(m => (
          <button
            key={m.key}
            onClick={() => {
              onModeChange(m.key);
              onSelectionChange({ mode: m.key, rows: new Set(), cols: new Set(), cell: null, rangeStart: null, rangeEnd: null });
            }}
            className={cn(
              "relative px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200",
              mode === m.key
                ? "text-[#08090A]"
                : "text-[#9CA3AF] hover:text-white"
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

      {/* Table */}
      <div className="flex-1 overflow-auto rounded-xl border border-white/[0.06] bg-white/[0.01]">
        <table className="w-full text-sm border-collapse">
          <thead className="sticky top-0 z-10">
            <tr>
              {/* Row number header */}
              <th className="w-10 border-b border-white/[0.06] bg-[#0E0F11] px-3 py-3 text-left text-xs font-medium text-[#9CA3AF]">
                #
              </th>
              {columns.map(col => (
                <th
                  key={col}
                  onClick={() => mode === "column" && handleCellClick(0, col)}
                  onMouseEnter={() => setHoveredCol(col)}
                  onMouseLeave={() => setHoveredCol(null)}
                  className={cn(
                    "border-b border-white/[0.06] bg-[#0E0F11] px-4 py-3 text-left text-xs font-medium tracking-wide transition-colors duration-150 whitespace-nowrap",
                    mode === "column" ? "cursor-pointer select-none" : "",
                    selection.cols.has(col)
                      ? "text-[#00E6A7] bg-[#00E6A7]/10"
                      : isColHighlighted(col)
                      ? "text-white bg-white/5"
                      : "text-[#9CA3AF]"
                  )}
                >
                  {col}
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
                  selection.rows.has(rIdx) ? "bg-[#00E6A7]/8" : isRowHighlighted(rIdx) ? "bg-white/[0.025]" : ""
                )}
              >
                {/* Row index */}
                <td className="px-3 py-3 text-xs text-[#9CA3AF]/50 font-['Space_Grotesk']">
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
                        mode !== "row" ? "cursor-pointer" : "cursor-default",
                        selected
                          ? "bg-[#00E6A7]/12 text-[#00E6A7]"
                          : "text-white/80"
                      )}
                    >
                      {isPhoto ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={row[col]}
                          alt=""
                          className="h-7 w-7 rounded-full object-cover"
                        />
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
