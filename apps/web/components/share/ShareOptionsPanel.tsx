"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Zap, Lock, Clock, Eye, Palette, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ShareOptions {
  mode: "snapshot" | "live";
  theme: string;
  pin: string;
  expiresIn: string;
  maxViews: string;
}

interface ShareOptionsProps {
  options: ShareOptions;
  onChange: (opts: ShareOptions) => void;
}

const THEMES = [
  { key: "default", label: "Emerald", color: "#00E6A7" },
  { key: "blue", label: "Arctic", color: "#5BE7FF" },
  { key: "purple", label: "Violet", color: "#A78BFA" },
  { key: "gold", label: "Gold", color: "#F59E0B" },
];

const EXPIRY_OPTIONS = [
  { value: "", label: "Never" },
  { value: "1h", label: "1 hour" },
  { value: "24h", label: "24 hours" },
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
];

function Section({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Icon className="h-3.5 w-3.5 text-[#9CA3AF]" />
        <span className="text-xs font-medium text-[#9CA3AF] uppercase tracking-wider">{title}</span>
      </div>
      {children}
    </div>
  );
}

export function ShareOptionsPanel({ options, onChange }: ShareOptionsProps) {
  function set<K extends keyof ShareOptions>(key: K, val: ShareOptions[K]) {
    onChange({ ...options, [key]: val });
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Mode */}
      <Section title="Data mode" icon={Camera}>
        <div className="grid grid-cols-2 gap-2">
          {(["snapshot", "live"] as const).map(m => (
            <button
              key={m}
              onClick={() => set("mode", m)}
              className={cn(
                "relative flex flex-col items-start gap-1 rounded-xl border p-4 text-left transition-all duration-200",
                options.mode === m
                  ? "border-[#00E6A7]/40 bg-[#00E6A7]/5"
                  : "border-white/[0.06] bg-white/[0.02] hover:border-white/10"
              )}
            >
              {options.mode === m && (
                <motion.div layoutId="mode-bg" className="absolute inset-0 rounded-xl border border-[#00E6A7]/30" />
              )}
              <div className="flex items-center gap-2">
                {m === "snapshot" ? <Camera className="h-3.5 w-3.5 text-[#00E6A7]" /> : <Zap className="h-3.5 w-3.5 text-[#5BE7FF]" />}
                <span className="text-xs font-semibold text-white capitalize">{m}</span>
              </div>
              <p className="text-[10px] text-[#9CA3AF]">
                {m === "snapshot" ? "Fixed data, captured now" : "Always shows latest data"}
              </p>
            </button>
          ))}
        </div>
      </Section>

      {/* Theme */}
      <Section title="Theme" icon={Palette}>
        <div className="flex gap-2">
          {THEMES.map(t => (
            <button
              key={t.key}
              onClick={() => set("theme", t.key)}
              title={t.label}
              className={cn(
                "relative flex h-8 w-8 items-center justify-center rounded-lg border-2 transition-all duration-200",
                options.theme === t.key ? "border-white scale-110" : "border-transparent hover:scale-105"
              )}
              style={{ background: `${t.color}20` }}
            >
              <div className="h-3 w-3 rounded-full" style={{ background: t.color }} />
            </button>
          ))}
        </div>
      </Section>

      {/* Security */}
      <Section title="Security" icon={Lock}>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-[#9CA3AF] mb-1.5 block">PIN protection</label>
            <input
              type="text"
              value={options.pin}
              onChange={e => set("pin", e.target.value)}
              placeholder="Leave blank for public access"
              maxLength={8}
              className="h-10 w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 text-sm text-white placeholder:text-[#9CA3AF]/40 focus:border-[#00E6A7]/50 focus:outline-none transition-colors"
            />
          </div>
        </div>
      </Section>

      {/* Limits */}
      <Section title="Limits" icon={Clock}>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-[#9CA3AF] mb-1.5 block">Expires</label>
            <div className="relative">
              <select
                value={options.expiresIn}
                onChange={e => set("expiresIn", e.target.value)}
                className="h-10 w-full appearance-none rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 pr-8 text-sm text-white focus:border-[#00E6A7]/50 focus:outline-none transition-colors"
              >
                {EXPIRY_OPTIONS.map(o => (
                  <option key={o.value} value={o.value} className="bg-[#0E0F11]">{o.label}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9CA3AF] pointer-events-none" />
            </div>
          </div>
          <div>
            <label className="text-xs text-[#9CA3AF] mb-1.5 block flex items-center gap-1">
              <Eye className="h-3 w-3" /> Max views
            </label>
            <input
              type="number"
              min="1"
              value={options.maxViews}
              onChange={e => set("maxViews", e.target.value)}
              placeholder="Unlimited"
              className="h-10 w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 text-sm text-white placeholder:text-[#9CA3AF]/40 focus:border-[#00E6A7]/50 focus:outline-none transition-colors"
            />
          </div>
        </div>
      </Section>
    </div>
  );
}
