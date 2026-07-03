"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { ChevronDown, LayoutGrid, Bell, LogOut, User, BarChart3 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export function Navbar() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [profileOpen, setProfileOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const userName = user?.name ?? "User";

  return (
    <header className="sticky top-0 z-50 flex h-14 items-center justify-between border-b border-white/[0.06] bg-[#08090A]/80 px-4 sm:px-6 backdrop-blur-xl">
      {/* Logo + nav */}
      <div className="flex items-center gap-3 sm:gap-6">
        {/* Logo -> home/dashboard */}
        <button
          onClick={() => router.push("/dashboard")}
          className="flex items-center gap-2.5 rounded-lg transition-opacity hover:opacity-80"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#00E6A7]">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <rect x="2" y="2" width="5" height="5" rx="1" fill="#08090A" />
              <rect x="9" y="2" width="5" height="5" rx="1" fill="#08090A" opacity="0.6" />
              <rect x="2" y="9" width="5" height="5" rx="1" fill="#08090A" opacity="0.6" />
              <rect x="9" y="9" width="5" height="5" rx="1" fill="#08090A" opacity="0.3" />
            </svg>
          </div>
          <span className="font-['Inter_Tight'] text-base font-semibold text-white">DataVault</span>
        </button>

        <div className="hidden sm:block h-4 w-px bg-white/10" />

        {/* Workspace -> dashboard */}
        <button
          onClick={() => router.push("/dashboard")}
          className="hidden sm:flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm text-[#9CA3AF] hover:bg-white/5 hover:text-white transition-all duration-200"
        >
          <LayoutGrid className="h-3.5 w-3.5" />
          <span>My Workspace</span>
        </button>

        {/* Analytics quick link */}
        <button
          onClick={() => router.push("/analytics")}
          className="hidden md:flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-sm text-[#9CA3AF] hover:bg-white/5 hover:text-white transition-all"
        >
          <BarChart3 className="h-3.5 w-3.5" /> Analytics
        </button>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => { setBellOpen(!bellOpen); setProfileOpen(false); }}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#9CA3AF] hover:bg-white/5 hover:text-white transition-all duration-200"
          >
            <Bell className="h-4 w-4" />
          </button>
          <AnimatePresence>
            {bellOpen && (
              <motion.div
                initial={{ opacity: 0, y: 6, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.96 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-10 w-72 rounded-xl border border-white/8 bg-[#0E0F11] p-4 shadow-2xl z-50"
              >
                <p className="text-sm font-medium text-white mb-1">Notifications</p>
                <p className="text-xs text-[#9CA3AF]">You&apos;re all caught up. New activity on your shares will appear here.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Profile */}
        <div className="relative">
          <button
            onClick={() => { setProfileOpen(!profileOpen); setBellOpen(false); }}
            className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-white/5 transition-all duration-200"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#00E6A7]/20 text-xs font-semibold text-[#00E6A7]">
              {userName.charAt(0).toUpperCase()}
            </div>
            <span className="hidden sm:block text-sm text-[#9CA3AF]">{userName}</span>
            <ChevronDown className="hidden sm:block h-3 w-3 text-[#9CA3AF]" />
          </button>

          <AnimatePresence>
            {profileOpen && (
              <motion.div
                initial={{ opacity: 0, y: 6, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.96 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-10 w-44 rounded-xl border border-white/8 bg-[#0E0F11] py-1 shadow-2xl z-50"
              >
                <div className="px-3 py-2 border-b border-white/[0.06]">
                  <p className="text-sm text-white truncate">{userName}</p>
                  <p className="text-xs text-[#9CA3AF] truncate">{user?.email}</p>
                </div>
                <button
                  onClick={() => logout()}
                  className="mt-1 flex w-full items-center gap-2.5 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
