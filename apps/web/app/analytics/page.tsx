"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Eye, Share2, TrendingUp, Layers, ArrowUpRight, Inbox } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { analytics as analyticsApi, WorkspaceAnalytics } from "@/lib/api";

export default function AnalyticsPage() {
  const { user, loading } = useRequireAuth();
  const [data, setData] = useState<WorkspaceAnalytics | null>(null);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    let alive = true;
    (async () => {
      try {
        const res = await analyticsApi.workspace();
        if (alive) setData(res.data);
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : "Failed to load analytics");
      } finally {
        if (alive) setFetching(false);
      }
    })();
    return () => { alive = false; };
  }, [user]);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-[#08090A] flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-[#00E6A7]/20 border-t-[#00E6A7] animate-spin" />
      </div>
    );
  }

  const avgPerShare = data && data.total_shares > 0
    ? Math.round(data.total_views / data.total_shares)
    : 0;

  const stats = [
    { label: "Total views", value: data?.total_views ?? 0, icon: Eye, color: "#00E6A7" },
    { label: "Active shares", value: data?.total_shares ?? 0, icon: Share2, color: "#5BE7FF" },
    { label: "Avg. per share", value: avgPerShare, icon: TrendingUp, color: "#A78BFA" },
    { label: "Workspaces", value: 1, icon: Layers, color: "#F59E0B" },
  ];

  const topShares = data?.top_shares ?? [];
  const maxViews = Math.max(1, ...topShares.map(s => s.view_count));

  return (
    <div className="min-h-screen bg-[#08090A] flex flex-col">
      <Navbar />

      <main className="flex-1 px-4 sm:px-8 py-8 max-w-6xl mx-auto w-full">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="font-['Inter_Tight'] text-2xl font-bold text-white">Analytics</h1>
          <p className="text-sm text-[#9CA3AF] mt-1">My Workspace · Live data</p>
        </motion.div>

        {fetching ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-6 w-6 rounded-full border-2 border-[#00E6A7]/20 border-t-[#00E6A7] animate-spin" />
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/5 px-5 py-4 text-sm text-red-400">{error}</div>
        ) : (
          <>
            {/* Stat cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {stats.map((s, i) => (
                <motion.div
                  key={s.label}
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                  className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl" style={{ background: `${s.color}15` }}>
                      <s.icon className="h-4 w-4" style={{ color: s.color }} />
                    </div>
                  </div>
                  <p className="font-['Space_Grotesk'] text-2xl font-semibold text-white">{s.value.toLocaleString()}</p>
                  <p className="text-xs text-[#9CA3AF] mt-1">{s.label}</p>
                </motion.div>
              ))}
            </div>

            {/* Top shares */}
            <motion.div
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden"
            >
              <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-white/[0.06]">
                <h3 className="text-sm font-semibold text-white">Top shares</h3>
                <span className="text-xs text-[#9CA3AF]">By views</span>
              </div>

              {topShares.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.03] border border-white/[0.07]">
                    <Inbox className="h-5 w-5 text-[#9CA3AF]" />
                  </div>
                  <p className="text-sm text-white">No shares yet</p>
                  <p className="text-xs text-[#9CA3AF] mt-1">Create a share and its view stats will appear here.</p>
                </div>
              ) : (
                topShares.map((s, i) => (
                  <motion.div
                    key={s.share_id}
                    initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35 + i * 0.06 }}
                    className="flex items-center gap-3 sm:gap-4 px-5 sm:px-6 py-4 border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] transition-colors"
                  >
                    <span className="font-['Space_Grotesk'] text-xs text-[#9CA3AF] w-4 shrink-0">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white font-['Space_Grotesk'] truncate">{s.token}</p>
                      {/* mini bar */}
                      <div className="mt-1.5 h-1 w-full max-w-[200px] rounded-full bg-white/[0.05] overflow-hidden">
                        <div className="h-full rounded-full bg-[#00E6A7]" style={{ width: `${(s.view_count / maxViews) * 100}%` }} />
                      </div>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs border ${
                      s.mode === "live"
                        ? "border-[#5BE7FF]/30 bg-[#5BE7FF]/10 text-[#5BE7FF]"
                        : "border-[#00E6A7]/30 bg-[#00E6A7]/10 text-[#00E6A7]"
                    }`}>
                      {s.mode}
                    </span>
                    <p className="font-['Space_Grotesk'] text-sm font-medium text-white w-12 text-right shrink-0">
                      {s.view_count.toLocaleString()}
                    </p>
                    <a
                      href={`/view/${s.token}`}
                      target="_blank"
                      className="text-[#9CA3AF] hover:text-white transition-colors shrink-0"
                    >
                      <ArrowUpRight className="h-4 w-4" />
                    </a>
                  </motion.div>
                ))
              )}
            </motion.div>
          </>
        )}
      </main>
    </div>
  );
}
