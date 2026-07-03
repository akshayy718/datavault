"use client";
import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Sparkles, ChevronRight, Filter, AlertTriangle, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface AIPanelProps {
  columns: string[];
  rows: Record<string, string>[];
  onSuggest: (rowIndices: number[]) => void;
  onFilter: (query: string) => void;
}

interface Suggestion {
  icon: typeof Filter;
  label: string;
  desc: string;
  rows: number[];
  color: string;
}

// Build suggestions from the ACTUAL data, not hardcoded indices.
function computeSuggestions(columns: string[], rows: Record<string, string>[]): Suggestion[] {
  const out: Suggestion[] = [];
  if (rows.length === 0) return out;

  // 1. Largest group by the first "category-like" column (Department, Team, Role, etc.)
  const catCol = columns.find(c => /department|team|role|category|type|group/i.test(c));
  if (catCol) {
    const groups: Record<string, number[]> = {};
    rows.forEach((r, i) => {
      const key = r[catCol] || "—";
      (groups[key] ??= []).push(i);
    });
    const biggest = Object.entries(groups).sort((a, b) => b[1].length - a[1].length)[0];
    if (biggest && biggest[1].length > 1) {
      out.push({
        icon: Users,
        label: `${biggest[0]} group`,
        desc: `${biggest[1].length} matching rows`,
        rows: biggest[1],
        color: "#00E6A7",
      });
    }
  }

  // 2. Real duplicate detection on an email-like or name column
  const dupCol = columns.find(c => /email|name|id/i.test(c)) ?? columns[0];
  const seen: Record<string, number[]> = {};
  rows.forEach((r, i) => {
    const key = (r[dupCol] || "").toLowerCase().trim();
    if (key) (seen[key] ??= []).push(i);
  });
  const dupes = Object.values(seen).filter(idxs => idxs.length > 1).flat();
  if (dupes.length > 0) {
    out.push({
      icon: AlertTriangle,
      label: "Possible duplicates",
      desc: `${dupes.length} rows share a ${dupCol}`,
      rows: dupes,
      color: "#5BE7FF",
    });
  }

  // 3. First N rows as a quick "sample"
  out.push({
    icon: Filter,
    label: "First 3 rows",
    desc: "Quick sample selection",
    rows: rows.slice(0, 3).map((_, i) => i),
    color: "#00E6A7",
  });

  return out;
}

export function AIPanel({ columns, rows, onSuggest, onFilter }: AIPanelProps) {
  const [query, setQuery] = useState("");
  const [thinking, setThinking] = useState(false);
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  const suggestions = useMemo(() => computeSuggestions(columns, rows), [columns, rows]);

  async function handleQuery(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setThinking(true);
    await new Promise(r => setTimeout(r, 500));
    setThinking(false);
    onFilter(query);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#00E6A7]/15">
          <Sparkles className="h-3.5 w-3.5 text-[#00E6A7]" />
        </div>
        <span className="text-sm font-medium text-white">AI Assistant</span>
        <span className="ml-auto text-xs text-[#9CA3AF] rounded-full border border-white/10 px-2 py-0.5">Beta</span>
      </div>

      <form onSubmit={handleQuery} className="relative">
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder='Try "Engineering" or a name'
          className="h-10 w-full rounded-xl border border-white/[0.08] bg-white/[0.03] pl-3 pr-10 text-sm text-white placeholder:text-[#9CA3AF]/60 focus:border-[#00E6A7]/50 focus:outline-none focus:ring-2 focus:ring-[#00E6A7]/15 transition-all duration-200"
        />
        <button
          type="submit"
          disabled={thinking || !query.trim()}
          className="absolute right-2 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-lg bg-[#00E6A7] text-[#08090A] disabled:opacity-40 transition-opacity"
        >
          {thinking ? (
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="h-3 w-3 rounded-full border border-[#08090A] border-t-transparent" />
          ) : (
            <ChevronRight className="h-3 w-3" />
          )}
        </button>
      </form>

      <div className="space-y-2">
        <p className="text-xs text-[#9CA3AF] font-medium uppercase tracking-wider">Suggestions</p>
        {suggestions.length === 0 && (
          <p className="text-xs text-[#9CA3AF]">Upload data to see suggestions.</p>
        )}
        {suggestions.map((s, i) => (
          <motion.button
            key={i}
            onClick={() => { setActiveIdx(i); onSuggest(s.rows); }}
            whileTap={{ scale: 0.98 }}
            className={cn(
              "flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-all duration-200",
              activeIdx === i ? "border-[#00E6A7]/30 bg-[#00E6A7]/5" : "border-white/[0.06] bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.04]"
            )}
          >
            <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg" style={{ background: `${s.color}15` }}>
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
