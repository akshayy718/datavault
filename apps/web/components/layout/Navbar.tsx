"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown, LayoutGrid, Bell, LogOut, User } from "lucide-react";
import { clearTokens } from "@/lib/api";
import { useRouter } from "next/navigation";

interface NavbarProps {
  userName?: string;
}

export function Navbar({ userName = "Akshay" }: NavbarProps) {
  const router = useRouter();
  const [profileOpen, setProfileOpen] = useState(false);

  function handleLogout() {
    clearTokens();
    router.push("/auth");
  }

  return (
    <header className="sticky top-0 z-50 flex h-14 items-center justify-between border-b border-white/[0.06] bg-[#08090A]/80 px-6 backdrop-blur-xl">
      {/* Logo */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#00E6A7]">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <rect x="2" y="2" width="5" height="5" rx="1" fill="#08090A" />
              <rect x="9" y="2" width="5" height="5" rx="1" fill="#08090A" opacity="0.6" />
              <rect x="2" y="9" width="5" height="5" rx="1" fill="#08090A" opacity="0.6" />
              <rect x="9" y="9" width="5" height="5" rx="1" fill="#08090A" opacity="0.3" />
            </svg>
          </div>
          <span className="font-['Inter_Tight'] text-base font-semibold text-white">DataVault</span>
        </div>

        {/* Divider */}
        <div className="h-4 w-px bg-white/10" />

        {/* Workspace */}
        <button className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm text-[#9CA3AF] hover:bg-white/5 hover:text-white transition-all duration-200">
          <LayoutGrid className="h-3.5 w-3.5" />
          <span>My Workspace</span>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </button>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        <button className="flex h-8 w-8 items-center justify-center rounded-lg text-[#9CA3AF] hover:bg-white/5 hover:text-white transition-all duration-200">
          <Bell className="h-4 w-4" />
        </button>

        {/* Profile */}
        <div className="relative">
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-white/5 transition-all duration-200"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#00E6A7]/20 text-xs font-semibold text-[#00E6A7]">
              {userName.charAt(0).toUpperCase()}
            </div>
            <span className="text-sm text-[#9CA3AF]">{userName}</span>
            <ChevronDown className="h-3 w-3 text-[#9CA3AF]" />
          </button>

          {profileOpen && (
            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-10 w-44 rounded-xl border border-white/8 bg-[#0E0F11] py-1 shadow-2xl"
            >
              <button className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-[#9CA3AF] hover:bg-white/5 hover:text-white transition-colors">
                <User className="h-4 w-4" />
                Profile
              </button>
              <div className="my-1 h-px bg-white/[0.06]" />
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </motion.div>
          )}
        </div>
      </div>
    </header>
  );
}
