"use client";
import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

interface FilterRule {
  id: string;
  column: string;
  operator: "equals" | "contains" | "not_equals";
  value: string;
}

interface FilterBuilderProps {
  columns: string[];
  onFilter: (rules: FilterRule[]) => void;
}

const OPERATORS = [
  { key: "equals" as const, label: "equals" },
  { key: "contains" as const, label: "contains" },
  { key: "not_equals" as const, label: "is not" },
];

export function FilterBuilder({ columns, onFilter }: FilterBuilderProps) {
  const [rules, setRules] = useState<FilterRule[]>([
    { id: "1", column: columns[0] ?? "", operator: "equals", value: "" },
  ]);

  function update(id: string, patch: Partial<FilterRule>) {
    const next = rules.map(r => r.id === id ? { ...r, ...patch } : r);
    setRules(next);
  }

  function remove(id: string) {
    setRules(rules.filter(r => r.id !== id));
  }

  function add() {
    setRules([...rules, { id: Date.now().toString(), column: columns[0] ?? "", operator: "equals", value: "" }]);
  }

  function apply() {
    onFilter(rules.filter(r => r.value.trim()));
  }

  return (
    <div className="space-y-3">
      {rules.map(rule => (
        <div key={rule.id} className="flex items-center gap-2">
          <select
            value={rule.column}
            onChange={e => update(rule.id, { column: e.target.value })}
            className="h-9 flex-1 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 text-xs text-white focus:outline-none focus:border-[#00E6A7]/50"
          >
            {columns.map(c => <option key={c} value={c} className="bg-[#0E0F11]">{c}</option>)}
          </select>
          <select
            value={rule.operator}
            onChange={e => update(rule.id, { operator: e.target.value as FilterRule["operator"] })}
            className="h-9 w-24 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2 text-xs text-white focus:outline-none focus:border-[#00E6A7]/50"
          >
            {OPERATORS.map(op => <option key={op.key} value={op.key} className="bg-[#0E0F11]">{op.label}</option>)}
          </select>
          <input
            value={rule.value}
            onChange={e => update(rule.id, { value: e.target.value })}
            placeholder="Value"
            className="h-9 flex-1 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 text-xs text-white placeholder:text-[#9CA3AF]/50 focus:outline-none focus:border-[#00E6A7]/50"
          />
          {rules.length > 1 && (
            <button onClick={() => remove(rule.id)} className="text-[#9CA3AF] hover:text-white transition-colors">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      ))}

      <div className="flex gap-2">
        <button
          onClick={add}
          className="flex items-center gap-1.5 text-xs text-[#9CA3AF] hover:text-white transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Add condition
        </button>
        <Button size="sm" onClick={apply} className="ml-auto">Apply filter</Button>
      </div>
    </div>
  );
}
