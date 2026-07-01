"use client";
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { SelectionModeBar, SelectMode } from "@/components/select/SelectionModeBar";
import { SelectionCard } from "@/components/select/SelectionCard";
import { FilterBuilder } from "@/components/select/FilterBuilder";
import { PreviewPanel } from "@/components/select/PreviewPanel";

// Demo data (same as DropZone)
const DEMO_COLUMNS = ["Name", "Department", "Email", "Photo", "Title"];
const DEMO_ROWS = [
  { Name: "Aisha Rahman", Department: "Engineering", Email: "aisha.rahman@example.com", Photo: "https://i.pravatar.cc/150?img=1", Title: "Senior Engineer" },
  { Name: "Daniel Okoro", Department: "Sales", Email: "daniel.okoro@example.com", Photo: "https://i.pravatar.cc/150?img=2", Title: "Account Executive" },
  { Name: "Mei Lin", Department: "Engineering", Email: "mei.lin@example.com", Photo: "https://i.pravatar.cc/150?img=3", Title: "Staff Engineer" },
  { Name: "Carlos Rivera", Department: "Design", Email: "carlos.rivera@example.com", Photo: "https://i.pravatar.cc/150?img=4", Title: "Product Designer" },
  { Name: "Priya Nair", Department: "Engineering", Email: "priya.nair@example.com", Photo: "https://i.pravatar.cc/150?img=7", Title: "Engineering Manager" },
  { Name: "Samuel Green", Department: "Marketing", Email: "samuel.green@example.com", Photo: "https://i.pravatar.cc/150?img=8", Title: "Growth Lead" },
  { Name: "Fatima Al-Zahra", Department: "HR", Email: "fatima@example.com", Photo: "https://i.pravatar.cc/150?img=9", Title: "People Ops" },
  { Name: "Tomás Herrera", Department: "Sales", Email: "tomas@example.com", Photo: "https://i.pravatar.cc/150?img=10", Title: "Sales Director" },
];

export default function SelectPage() {
  const router = useRouter();
  const [mode, setMode] = useState<SelectMode>("row");
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [selectedCols, setSelectedCols] = useState<Set<string>>(new Set());
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: string } | null>(null);
  const [filteredIndices, setFilteredIndices] = useState<Set<number> | null>(null);
  const [search, setSearch] = useState("");

  function resetSelection() {
    setSelectedRows(new Set());
    setSelectedCols(new Set());
    setSelectedCell(null);
    setFilteredIndices(null);
  }

  function handleModeChange(m: SelectMode) {
    setMode(m);
    resetSelection();
  }

  function handleRowClick(idx: number) {
    if (mode !== "row") return;
    const next = new Set(selectedRows);
    next.has(idx) ? next.delete(idx) : next.add(idx);
    setSelectedRows(next);
  }

  function handleCellClick(rowIdx: number, col: string) {
    if (mode === "cell") {
      setSelectedCell(selectedCell?.row === rowIdx && selectedCell?.col === col ? null : { row: rowIdx, col });
    } else if (mode === "column") {
      const next = new Set(selectedCols);
      next.has(col) ? next.delete(col) : next.add(col);
      setSelectedCols(next);
    }
  }

  function handleFilter(rules: { column: string; operator: string; value: string }[]) {
    const matched = new Set(
      DEMO_ROWS
        .map((row, i) => ({ row, i }))
        .filter(({ row }) =>
          rules.every(rule => {
            const v = row[rule.column as keyof typeof row]?.toLowerCase() ?? "";
            const val = rule.value.toLowerCase();
            if (rule.operator === "equals") return v === val;
            if (rule.operator === "contains") return v.includes(val);
            if (rule.operator === "not_equals") return v !== val;
            return true;
          })
        )
        .map(({ i }) => i)
    );
    setFilteredIndices(matched);
    // auto-select filtered rows
    setSelectedRows(matched);
  }

  const visibleRows = useMemo(() => {
    let rows = DEMO_ROWS.map((row, i) => ({ row, i }));
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(({ row }) => Object.values(row).some(v => v.toLowerCase().includes(q)));
    }
    return rows;
  }, [search]);

  const selectionCount = mode === "row" ? selectedRows.size
    : mode === "column" ? selectedCols.size
    : mode === "cell" ? (selectedCell ? 1 : 0)
    : selectedRows.size;

  const previewRows = DEMO_ROWS.filter((_, i) => selectedRows.has(i));
  const previewCell = selectedCell ? {
    col: selectedCell.col,
    value: DEMO_ROWS[selectedCell.row]?.[selectedCell.col as keyof typeof DEMO_ROWS[0]] ?? "",
  } : null;

  function handleContinue() {
    router.push("/share");
  }

  return (
    <div className="min-h-screen bg-[#08090A] flex flex-col">
      <Navbar />

      <main className="flex flex-1 overflow-hidden">
        {/* ── Left: Cards grid ── */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Toolbar */}
          <div className="flex items-center gap-4 border-b border-white/[0.06] px-6 py-4">
            <div className="flex items-center gap-2 text-xs text-[#9CA3AF]">
              <span className="text-[#00E6A7]">employees.csv</span>
              <span>/</span>
              <span className="text-white">Select data</span>
            </div>
            <div className="ml-auto flex items-center gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9CA3AF]" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search rows..."
                  className="h-8 w-48 rounded-lg border border-white/[0.08] bg-white/[0.03] pl-8 pr-3 text-xs text-white placeholder:text-[#9CA3AF]/60 focus:border-[#00E6A7]/40 focus:outline-none transition-colors"
                />
              </div>
              <SelectionModeBar mode={mode} onChange={handleModeChange} count={selectionCount} />
            </div>
          </div>

          {/* Filter builder (only in filter mode) */}
          <AnimatePresence>
            {mode === "filter" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="border-b border-white/[0.06] px-6 py-4 bg-white/[0.01] overflow-hidden"
              >
                <FilterBuilder columns={DEMO_COLUMNS} onFilter={handleFilter} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Cards grid */}
          <div className="flex-1 overflow-y-auto px-6 py-6">
            {/* Mode hint */}
            <p className="text-xs text-[#9CA3AF] mb-4">
              {mode === "row" && "Click cards to select rows"}
              {mode === "column" && "Click field labels to select a column"}
              {mode === "cell" && "Click individual field values to select a cell"}
              {mode === "range" && "Use row selection to define a range"}
              {mode === "filter" && "Use the filter above, or click cards to refine"}
            </p>

            {visibleRows.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <p className="text-sm text-[#9CA3AF]">No rows match your search</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {visibleRows.map(({ row, i }) => (
                  <SelectionCard
                    key={i}
                    index={i}
                    row={row}
                    columns={DEMO_COLUMNS}
                    selected={
                      mode === "row" ? selectedRows.has(i)
                        : mode === "filter" ? selectedRows.has(i)
                        : false
                    }
                    highlighted={
                      filteredIndices !== null && filteredIndices.has(i) && !selectedRows.has(i)
                    }
                    selectionMode={mode}
                    selectedCols={selectedCols}
                    selectedCell={selectedCell}
                    rowIndex={i}
                    onClick={() => handleRowClick(i)}
                    onCellClick={(col) => handleCellClick(i, col)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Right: Live preview panel ── */}
        <div className="w-72 shrink-0 border-l border-white/[0.06] flex flex-col px-5 py-6 overflow-y-auto">
          <PreviewPanel
            selectedRows={previewRows}
            selectedCols={Array.from(selectedCols)}
            selectedCell={previewCell}
            mode={mode}
            onContinue={handleContinue}
          />
        </div>
      </main>
    </div>
  );
}
