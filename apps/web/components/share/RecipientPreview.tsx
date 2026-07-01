"use client";
import { motion } from "framer-motion";
import { Eye } from "lucide-react";

interface RecipientPreviewProps {
  selectedData: {
    name?: string;
    title?: string;
    department?: string;
    email?: string;
    photo?: string;
  };
  theme: string;
}

const THEME_COLORS: Record<string, { primary: string; bg: string; glow: string }> = {
  default: { primary: "#00E6A7", bg: "rgba(0,230,167,0.08)", glow: "rgba(0,230,167,0.15)" },
  blue:    { primary: "#5BE7FF", bg: "rgba(91,231,255,0.08)", glow: "rgba(91,231,255,0.15)" },
  purple:  { primary: "#A78BFA", bg: "rgba(167,139,250,0.08)", glow: "rgba(167,139,250,0.15)" },
  gold:    { primary: "#F59E0B", bg: "rgba(245,158,11,0.08)", glow: "rgba(245,158,11,0.15)" },
};

export function RecipientPreview({ selectedData, theme }: RecipientPreviewProps) {
  const colors = THEME_COLORS[theme] ?? THEME_COLORS.default;
  const initials = (selectedData.name ?? "?")
    .split(" ").map(w => w[0]).slice(0, 2).join("");

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 mb-6">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-white/5">
          <Eye className="h-3.5 w-3.5 text-[#9CA3AF]" />
        </div>
        <span className="text-sm font-medium text-white">Recipient view</span>
        <span className="ml-auto text-xs text-[#9CA3AF]">Live preview</span>
      </div>

      {/* Mock phone frame */}
      <div className="flex flex-1 items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-[200px]"
        >
          {/* Phone border */}
          <div className="rounded-[28px] border-2 border-white/10 bg-[#0A0B0C] overflow-hidden shadow-2xl">
            {/* Status bar */}
            <div className="flex items-center justify-between px-4 py-2">
              <span className="text-[10px] text-white/40">9:41</span>
              <div className="flex gap-1">
                <div className="h-1.5 w-1.5 rounded-full bg-white/30" />
                <div className="h-1.5 w-3 rounded-full bg-white/30" />
                <div className="h-1.5 w-4 rounded-full bg-white/30" />
              </div>
            </div>

            {/* Card content */}
            <div className="px-3 pb-5">
              {/* Glow */}
              <div
                className="absolute inset-x-0 top-8 h-24 blur-2xl pointer-events-none"
                style={{ background: colors.glow }}
              />

              {/* Avatar */}
              <div className="relative flex justify-center mb-3">
                {selectedData.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={selectedData.photo}
                    alt=""
                    className="h-16 w-16 rounded-2xl object-cover border-2"
                    style={{ borderColor: `${colors.primary}40` }}
                  />
                ) : (
                  <div
                    className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 text-lg font-bold"
                    style={{
                      background: colors.bg,
                      borderColor: `${colors.primary}40`,
                      color: colors.primary,
                    }}
                  >
                    {initials}
                  </div>
                )}
              </div>

              {/* Name + title */}
              <div className="text-center mb-3">
                <p className="text-xs font-semibold text-white">{selectedData.name ?? "—"}</p>
                <p className="text-[10px] mt-0.5" style={{ color: colors.primary }}>
                  {selectedData.title ?? "Title"}
                </p>
              </div>

              {/* Fields */}
              <div className="space-y-1.5">
                {[
                  { label: "Dept", value: selectedData.department },
                  { label: "Email", value: selectedData.email },
                ].map(f => (
                  <div
                    key={f.label}
                    className="flex items-center justify-between rounded-lg px-2.5 py-1.5"
                    style={{ background: colors.bg }}
                  >
                    <span className="text-[9px] text-white/40">{f.label}</span>
                    <span className="text-[9px] text-white/80 max-w-[90px] truncate text-right">
                      {f.value ?? "—"}
                    </span>
                  </div>
                ))}
              </div>

              {/* Powered by */}
              <div className="mt-3 text-center">
                <span className="text-[8px] text-white/20">Powered by DataVault</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
