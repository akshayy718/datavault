"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { ProductPreview } from "@/components/auth/ProductPreview";
import { LoginForm } from "@/components/auth/LoginForm";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { ForgotForm } from "@/components/auth/ForgotForm";

type AuthMode = "login" | "register" | "forgot";

export default function AuthPage() {
  const [mode, setMode] = useState<AuthMode>("login");
  const { user, loading } = useAuth();
  const router = useRouter();

  // If already authenticated, skip the auth screen entirely
  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard");
    }
  }, [loading, user, router]);

  return (
    <div className="min-h-screen bg-[#08090A] flex flex-col lg:flex-row">
      {/* ── Left panel ── */}
      <div className="hidden lg:flex flex-col relative overflow-hidden" style={{ width: "58%" }}>
        {/* Subtle grid */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)`,
            backgroundSize: "48px 48px",
          }}
        />

        {/* Ambient blobs */}
        <div className="absolute top-1/4 left-1/3 h-96 w-96 rounded-full bg-[#00E6A7]/8 blur-[100px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 h-64 w-64 rounded-full bg-[#5BE7FF]/6 blur-[80px] pointer-events-none" />

        {/* Content */}
        <div className="relative z-10 flex flex-col h-full px-16 py-14">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-center gap-2.5"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#00E6A7]">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="2" y="2" width="5" height="5" rx="1" fill="#08090A" />
                <rect x="9" y="2" width="5" height="5" rx="1" fill="#08090A" opacity="0.6" />
                <rect x="2" y="9" width="5" height="5" rx="1" fill="#08090A" opacity="0.6" />
                <rect x="9" y="9" width="5" height="5" rx="1" fill="#08090A" opacity="0.3" />
              </svg>
            </div>
            <span className="font-['Inter_Tight'] text-lg font-semibold text-white">DataVault</span>
          </motion.div>

          {/* Hero text */}
          <div className="flex-1 flex flex-col justify-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="mb-16"
            >
              <p className="text-sm font-medium text-[#00E6A7] mb-4 tracking-wide uppercase">
                Spreadsheet → Experience
              </p>
              <h1 className="font-['Inter_Tight'] text-4xl xl:text-5xl font-bold text-white leading-[1.1]">
                Transform Data<br />
                <span className="text-transparent bg-clip-text"
                  style={{ backgroundImage: "linear-gradient(135deg, #00E6A7, #5BE7FF)" }}>
                  Into Experiences
                </span>
              </h1>
              <p className="mt-4 text-base text-[#9CA3AF] max-w-sm leading-relaxed">
                Upload a spreadsheet. Select your data. Share a premium QR experience in seconds.
              </p>
            </motion.div>

            {/* Product preview */}
            <ProductPreview />
          </div>

          {/* Footer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2, duration: 0.4 }}
            className="mt-8 flex items-center gap-6"
          >
            {[
              { value: "10k+", label: "Shares created" },
              { value: "99.9%", label: "Uptime" },
              { value: "< 1s", label: "QR generation" },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="font-['Space_Grotesk'] text-lg font-semibold text-white">
                  {stat.value}
                </p>
                <p className="text-xs text-[#9CA3AF]">{stat.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* ── Right panel (auth card) ── */}
      {/* On mobile: full width. On desktop: 42% fixed */}
      <div className="flex flex-1 lg:flex-none lg:w-[42%] items-center justify-center p-6 sm:p-10 lg:p-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-sm sm:max-w-[400px]"
        >
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2.5 mb-10">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#00E6A7]">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="2" y="2" width="5" height="5" rx="1" fill="#08090A" />
                <rect x="9" y="2" width="5" height="5" rx="1" fill="#08090A" opacity="0.6" />
                <rect x="2" y="9" width="5" height="5" rx="1" fill="#08090A" opacity="0.6" />
                <rect x="9" y="9" width="5" height="5" rx="1" fill="#08090A" opacity="0.3" />
              </svg>
            </div>
            <span className="font-['Inter_Tight'] text-lg font-semibold text-white">DataVault</span>
          </div>

          {/* Glass card */}
          <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-8 backdrop-blur-sm">
            <AnimatePresence mode="wait">
              {mode === "login" && (
                <LoginForm key="login" onSwitch={setMode} />
              )}
              {mode === "register" && (
                <RegisterForm key="register" onSwitch={setMode} />
              )}
              {mode === "forgot" && (
                <ForgotForm key="forgot" onSwitch={setMode} />
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
