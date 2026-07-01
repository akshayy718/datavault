"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ChevronRight, Filter, AlertTriangle, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface AIPanelProps {
  columns: string[];
  rowCount: number;
  onSuggest: (rowIndices: number[]) => void;
  onFilter: (query: string) => void;
}

const SUGGESTIONS = [
  { icon: TrendingUp, label: "Top performers", desc: "Rows with highest seniority", rows: [0, 2, 4], color: "#00E6A7" },
  { icon: AlertTriangle, label: "Anomaly detected", desc: "Duplicate email pattern", rows: [3], color: "#5BE7FF" },
  { icon: Filter, label: "Engineering team", desc: "3 matching rows found", rows: [0, 2, 4], color: "#00E6A7" },
];

export function AIPanel({ columns, rowCount, onSuggest, onFilter }: AIPanelProps) {
  const [query, setQuery] = useState("");
  const [thinking, setThinking] = useState(false);
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  async function handleQuery(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setThinking(true);
    await new Promise(r => setTimeout(r, 900));
    setThinking(false);
    onFilter(query);
    setQuery("");
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#00E6A7]/15">
          <Sparkles className="h-3.5 w-3.5 text-[#00E6A7]" />
        </div>
        <span className="text-sm font-medium text-white">AI Assistant</span>
        <span className="ml-auto text-xs text-[#9CA3AF] rounded-full border border-white/10 px-2 py-0.5">
          Beta
        </span>
      </div>

      {/* Natural language filter */}
      <form onSubmit={handleQuery} className="relative">
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder='Try "show Engineering team"'
          className="h-10 w-full rounded-xl border border-white/[0.08] bg-white/[0.03] pl-3 pr-10 text-sm text-white placeholder:text-[#9CA3AF]/60 focus:border-[#00E6A7]/50 focus:outline-none focus:ring-2 focus:ring-[#00E6A7]/15 transition-all duration-200"
        />
        <button
          type="submit"
          disabled={thinking || !query.trim()}
          className="absolute right-2 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-lg bg-[#00E6A7] text-[#08090A] disabled:opacity-40 transition-opacity"
        >
          {thinking ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="h-3 w-3 rounded-full border border-[#08090A] border-t-transparent"
            />
          ) : (
            <ChevronRight className="h-3 w-3" />
          )}
        </button>
      </form>

      {/* Suggestions */}
      <div className="space-y-2">
        <p className="text-xs text-[#9CA3AF] font-medium uppercase tracking-wider">Suggestions</p>
        {SUGGESTIONS.map((s, i) => (
          <motion.button
            key={i}
            onClick={() => {
              setActiveIdx(i);
              onSuggest(s.rows);
            }}
            whileTap={{ scale: 0.98 }}
            className={cn(
              "flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-all duration-200",
              activeIdx === i
                ? "border-[#00E6A7]/30 bg-[#00E6A7]/5"
                : "border-white/[0.06] bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.04]"
            )}
          >
            <div
              className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg"
              style={{ background: `${s.color}15` }}
            >
              <s.icon className="h-3.5 w-3.5" style={{ color: s.color }} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-white">{s.label}</p>
              <p className="text-xs text-[#9CA3AF]">{s.desc}</p>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
