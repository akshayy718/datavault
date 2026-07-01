"use client";
import { motion } from "framer-motion";

const CARDS = [
  {
    name: "Aisha Rahman",
    title: "Senior Engineer",
    dept: "Engineering",
    color: "#00E6A7",
    avatar: "AR",
    delay: 0,
  },
  {
    name: "Daniel Okoro",
    title: "Account Executive",
    dept: "Sales",
    color: "#5BE7FF",
    avatar: "DO",
    delay: 0.1,
  },
  {
    name: "Mei Lin",
    title: "Staff Engineer",
    dept: "Engineering",
    color: "#00E6A7",
    avatar: "ML",
    delay: 0.2,
  },
];

const STAT = { views: "2.4k", scans: "847", shares: "12" };

export function ProductPreview() {
  return (
    <div className="relative w-full max-w-sm mx-auto select-none">
      {/* Ambient glow */}
      <div className="absolute inset-0 rounded-3xl bg-[#00E6A7]/5 blur-3xl scale-110 pointer-events-none" />

      {/* Main card stack */}
      <div className="relative">
        {/* Cards */}
        <div className="space-y-3">
          {CARDS.map((card, i) => (
            <motion.div
              key={card.name}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + card.delay, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="flex items-center gap-4 rounded-2xl border border-white/8 bg-white/3 p-4 backdrop-blur-sm"
            >
              {/* Avatar */}
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-semibold text-[#08090A]"
                style={{ background: card.color }}
              >
                {card.avatar}
              </div>
              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{card.name}</p>
                <p className="text-xs text-[#9CA3AF] truncate">{card.title}</p>
              </div>
              {/* Dept badge */}
              <span
                className="shrink-0 rounded-lg px-2.5 py-1 text-xs font-medium"
                style={{
                  background: `${card.color}15`,
                  color: card.color,
                }}
              >
                {card.dept}
              </span>
            </motion.div>
          ))}
        </div>

        {/* Analytics row */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="mt-4 grid grid-cols-3 gap-3"
        >
          {Object.entries(STAT).map(([label, value]) => (
            <div
              key={label}
              className="rounded-xl border border-white/8 bg-white/3 p-3 text-center"
            >
              <p className="font-['Space_Grotesk'] text-lg font-semibold text-white">{value}</p>
              <p className="text-xs text-[#9CA3AF] capitalize">{label}</p>
            </div>
          ))}
        </motion.div>

        {/* QR hint */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.0, duration: 0.5 }}
          className="mt-4 flex items-center gap-3 rounded-2xl border border-[#00E6A7]/20 bg-[#00E6A7]/5 p-4"
        >
          {/* Mini QR icon */}
          <div className="grid h-10 w-10 grid-cols-3 gap-0.5 rounded-lg bg-[#00E6A7]/10 p-1.5">
            {Array.from({ length: 9 }).map((_, i) => (
              <div
                key={i}
                className="rounded-[2px]"
                style={{
                  background: [0, 2, 6, 8, 4].includes(i)
                    ? "#00E6A7"
                    : "rgba(0,230,167,0.2)",
                }}
              />
            ))}
          </div>
          <div>
            <p className="text-xs font-medium text-[#00E6A7]">Share via QR</p>
            <p className="text-xs text-[#9CA3AF]">Scan to view on any device</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
