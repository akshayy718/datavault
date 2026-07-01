"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { Eye, QrCode, Share2, TrendingUp, Monitor, Smartphone, ArrowUpRight } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";

// Demo analytics data
const STATS = [
  { label: "Total views", value: "2,419", change: "+18%", icon: Eye, color: "#00E6A7" },
  { label: "QR scans", value: "847", change: "+24%", icon: QrCode, color: "#5BE7FF" },
  { label: "Active shares", value: "12", change: "+3", icon: Share2, color: "#A78BFA" },
  { label: "Avg. per share", value: "201", change: "+6%", icon: TrendingUp, color: "#F59E0B" },
];

const TIMELINE = [
  { day: "Mon", views: 280 }, { day: "Tue", views: 420 }, { day: "Wed", views: 310 },
  { day: "Thu", views: 590 }, { day: "Fri", views: 480 }, { day: "Sat", views: 200 },
  { day: "Sun", views: 139 },
];

const TOP_SHARES = [
  { name: "employees.csv", token: "RggQkN3...", views: 847, mode: "snapshot", trend: "+12%" },
  { name: "employees.csv", token: "ziYaSh7...", views: 523, mode: "snapshot", trend: "+8%" },
  { name: "employees.csv", token: "r_PsIWx...", views: 341, mode: "live", trend: "+3%" },
  { name: "employees.csv", token: "D3Mmdi...", views: 708, mode: "snapshot", trend: "+19%" },
];

const DEVICES = [
  { label: "Desktop", pct: 62, icon: Monitor, color: "#00E6A7" },
  { label: "Mobile", pct: 38, icon: Smartphone, color: "#5BE7FF" },
];

const maxViews = Math.max(...TIMELINE.map(d => d.views));

export default function AnalyticsPage() {
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-[#08090A] flex flex-col">
      <Navbar />

      <main className="flex-1 px-8 py-8 max-w-6xl mx-auto w-full">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="font-['Inter_Tight'] text-2xl font-bold text-white">Analytics</h1>
          <p className="text-sm text-[#9CA3AF] mt-1">Last 7 days · My Workspace</p>
        </motion.div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {STATS.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl" style={{ background: `${s.color}15` }}>
                  <s.icon className="h-4 w-4" style={{ color: s.color }} />
                </div>
                <span className="text-xs font-medium text-[#00E6A7] bg-[#00E6A7]/10 px-2 py-0.5 rounded-full">
                  {s.change}
                </span>
              </div>
              <p className="font-['Space_Grotesk'] text-2xl font-semibold text-white">{s.value}</p>
              <p className="text-xs text-[#9CA3AF] mt-1">{s.label}</p>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Timeline chart */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="lg:col-span-2 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-sm font-semibold text-white">Views over time</h3>
                <p className="text-xs text-[#9CA3AF] mt-0.5">Daily view count</p>
              </div>
            </div>

            {/* Bar chart */}
            <div className="flex items-end gap-3 h-40">
              {TIMELINE.map((d, i) => {
                const h = (d.views / maxViews) * 100;
                const hovered = hoveredBar === i;
                return (
                  <div
                    key={d.day}
                    className="flex flex-1 flex-col items-center gap-2"
                    onMouseEnter={() => setHoveredBar(i)}
                    onMouseLeave={() => setHoveredBar(null)}
                  >
                    {hovered && (
                      <motion.div
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="rounded-lg border border-white/10 bg-[#0E0F11] px-2 py-1 text-xs font-['Space_Grotesk'] text-white whitespace-nowrap"
                      >
                        {d.views}
                      </motion.div>
                    )}
                    <div className="relative flex-1 w-full flex items-end">
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${h}%` }}
                        transition={{ delay: 0.3 + i * 0.05, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                        className="w-full rounded-t-lg transition-colors duration-200"
                        style={{
                          background: hovered
                            ? "#00E6A7"
                            : "linear-gradient(to top, rgba(0,230,167,0.15), rgba(0,230,167,0.4))",
                        }}
                      />
                    </div>
                    <span className="text-xs text-[#9CA3AF]">{d.day}</span>
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* Device breakdown */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6"
          >
            <h3 className="text-sm font-semibold text-white mb-1">Device breakdown</h3>
            <p className="text-xs text-[#9CA3AF] mb-6">By device type</p>

            <div className="space-y-5">
              {DEVICES.map((d, i) => (
                <div key={d.label}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <d.icon className="h-3.5 w-3.5" style={{ color: d.color }} />
                      <span className="text-sm text-white">{d.label}</span>
                    </div>
                    <span className="font-['Space_Grotesk'] text-sm font-medium" style={{ color: d.color }}>
                      {d.pct}%
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-white/[0.05] overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${d.pct}%` }}
                      transition={{ delay: 0.5 + i * 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                      className="h-full rounded-full"
                      style={{ background: d.color }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="mt-8 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-center">
              <p className="font-['Space_Grotesk'] text-3xl font-bold text-white">2,419</p>
              <p className="text-xs text-[#9CA3AF] mt-1">Total views this week</p>
            </div>
          </motion.div>
        </div>

        {/* Top shares table */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden"
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
            <h3 className="text-sm font-semibold text-white">Top shares</h3>
            <span className="text-xs text-[#9CA3AF]">By views</span>
          </div>
          <div>
            {TOP_SHARES.map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + i * 0.07 }}
                className="flex items-center gap-4 px-6 py-4 border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] transition-colors"
              >
                <span className="font-['Space_Grotesk'] text-xs text-[#9CA3AF] w-4 shrink-0">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{s.name}</p>
                  <p className="text-xs text-[#9CA3AF] font-['Space_Grotesk']">{s.token}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs border ${
                  s.mode === "live"
                    ? "border-[#5BE7FF]/30 bg-[#5BE7FF]/10 text-[#5BE7FF]"
                    : "border-[#00E6A7]/30 bg-[#00E6A7]/10 text-[#00E6A7]"
                }`}>
                  {s.mode}
                </span>
                <p className="font-['Space_Grotesk'] text-sm font-medium text-white w-12 text-right shrink-0">
                  {s.views.toLocaleString()}
                </p>
                <span className="text-xs text-[#00E6A7] w-10 text-right shrink-0">{s.trend}</span>
                <button className="text-[#9CA3AF] hover:text-white transition-colors shrink-0">
                  <ArrowUpRight className="h-4 w-4" />
                </button>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </main>
    </div>
  );
}
