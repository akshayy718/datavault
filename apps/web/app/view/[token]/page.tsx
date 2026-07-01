"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, CheckCircle2, ExternalLink, Share2, Bookmark, BookmarkCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";

// Demo data — in production this would be fetched from /view/{token}
const DEMO_DATA = {
  mode: "snapshot",
  captured_at: new Date().toISOString(),
  format: "cards",
  data: {
    kind: "single",
    fields: {
      Name: "Aisha Rahman",
      Department: "Engineering",
      Email: "aisha.rahman@example.com",
      Photo: "https://i.pravatar.cc/150?img=1",
      Title: "Senior Engineer",
    },
  },
};

function useViewData(token: string) {
  const [data, setData] = useState<typeof DEMO_DATA | null>(null);
  const [loading, setLoading] = useState(true);
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    async function load() {
      await new Promise(r => setTimeout(r, 800));
      // Try the real backend first; fall back to demo data if not reachable
      try {
        const res = await fetch(`http://localhost:8000/view/${token}`);
        if (res.ok) {
          const json = await res.json();
          setData(json.data ?? json);
        } else if (res.status === 401) {
          setLocked(true);
        } else {
          setData(DEMO_DATA);
        }
      } catch {
        setData(DEMO_DATA);
      }
      setLoading(false);
    }
    load();
  }, [token]);

  return { data, loading, locked, setLocked, setData };
}

interface RecipientPageProps {
  params: { token: string };
}

export default function RecipientPage({ params }: RecipientPageProps) {
  const { data, loading, locked, setLocked, setData } = useViewData(params.token);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [unlocking, setUnlocking] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  const raw = data?.data as Record<string, unknown>;
  const fields = (raw?.fields ?? (raw?.items as Record<string, string>[])?.[0] ?? {}) as Record<string, string>;
  const photoUrl = fields.Photo ?? fields.photo ?? null;
  const name = fields.Name ?? fields.name ?? "—";
  const title = fields.Title ?? fields.title ?? null;
  const dept = fields.Department ?? fields.department ?? null;
  const email = fields.Email ?? fields.email ?? null;

  const initials = name.split(" ").map((w: string) => w[0]).slice(0, 2).join("");

  const displayFields = Object.entries(fields).filter(
    ([k]) => !["Photo", "photo", "Name", "name", "Title", "title"].includes(k)
  );

  async function handleUnlock(e: React.FormEvent) {
    e.preventDefault();
    setPinError("");
    setUnlocking(true);
    try {
      const res = await fetch(`http://localhost:8000/view/${params.token}/unlock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      if (res.ok) {
        const json = await res.json();
        setData(json.data ?? json);
        setLocked(false);
      } else {
        setPinError("Incorrect PIN. Please try again.");
      }
    } catch {
      // Demo fallback
      if (pin === "1234") { setData(DEMO_DATA); setLocked(false); }
      else setPinError("Incorrect PIN.");
    }
    setUnlocking(false);
  }

  function copyLink() {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="min-h-screen bg-[#08090A] flex flex-col">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 h-[500px] w-[800px] rounded-full bg-[#00E6A7]/4 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-64 w-64 rounded-full bg-[#5BE7FF]/3 blur-[100px]" />
      </div>

      <AnimatePresence mode="wait">
        {/* Loading */}
        {loading && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex flex-1 flex-col items-center justify-center min-h-screen gap-4"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
              className="h-8 w-8 rounded-full border-2 border-[#00E6A7]/20 border-t-[#00E6A7]"
            />
            <p className="text-sm text-[#9CA3AF]">Loading experience...</p>
          </motion.div>
        )}

        {/* PIN gate */}
        {!loading && locked && (
          <motion.div
            key="locked"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex flex-1 flex-col items-center justify-center min-h-screen px-6"
          >
            <div className="w-full max-w-sm">
              <div className="mb-8 flex flex-col items-center text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#00E6A7]/10 border border-[#00E6A7]/20">
                  <Lock className="h-6 w-6 text-[#00E6A7]" />
                </div>
                <h1 className="font-['Inter_Tight'] text-xl font-semibold text-white">PIN required</h1>
                <p className="mt-1.5 text-sm text-[#9CA3AF]">This share is protected. Enter the PIN to continue.</p>
              </div>
              <form onSubmit={handleUnlock} className="space-y-3">
                <input
                  type="text"
                  inputMode="numeric"
                  value={pin}
                  onChange={e => setPin(e.target.value)}
                  placeholder="Enter PIN"
                  maxLength={8}
                  className="h-14 w-full rounded-2xl border border-white/[0.08] bg-white/[0.03] px-5 text-center text-lg tracking-widest text-white placeholder:text-[#9CA3AF]/30 focus:border-[#00E6A7]/50 focus:outline-none focus:ring-2 focus:ring-[#00E6A7]/15 transition-all"
                />
                {pinError && <p className="text-sm text-red-400 text-center">{pinError}</p>}
                <Button type="submit" size="lg" loading={unlocking} className="w-full">Unlock</Button>
              </form>
              <p className="mt-6 text-center text-xs text-[#9CA3AF]">Powered by DataVault</p>
            </div>
          </motion.div>
        )}

        {/* Content */}
        {!loading && !locked && data && (
          <motion.div
            key="content"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex flex-1 flex-col items-center px-4 py-12 relative"
          >
            {/* Top bar */}
            <div className="fixed top-0 left-0 right-0 z-50 flex h-14 items-center justify-between px-6 backdrop-blur-xl border-b border-white/[0.04] bg-[#08090A]/60">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#00E6A7]">
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                    <rect x="2" y="2" width="5" height="5" rx="1" fill="#08090A" />
                    <rect x="9" y="2" width="5" height="5" rx="1" fill="#08090A" opacity="0.6" />
                    <rect x="2" y="9" width="5" height="5" rx="1" fill="#08090A" opacity="0.6" />
                    <rect x="9" y="9" width="5" height="5" rx="1" fill="#08090A" opacity="0.3" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-white">DataVault</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={copyLink}
                  className="flex h-8 items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 text-xs text-[#9CA3AF] hover:text-white transition-colors"
                >
                  <Share2 className="h-3.5 w-3.5" />
                  {copied ? "Copied!" : "Share"}
                </button>
                <button
                  onClick={() => setSaved(!saved)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-[#9CA3AF] hover:text-white transition-colors"
                >
                  {saved ? <BookmarkCheck className="h-3.5 w-3.5 text-[#00E6A7]" /> : <Bookmark className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>

            {/* Main card */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-md mt-14"
            >
              {/* Hero glass card */}
              <div className="relative rounded-3xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-sm overflow-hidden">
                {/* Top gradient accent */}
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#00E6A7]/40 to-transparent" />

                <div className="p-8">
                  {/* Avatar */}
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.2, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                    className="flex justify-center mb-6"
                  >
                    {photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={photoUrl}
                        alt={name}
                        className="h-24 w-24 rounded-2xl object-cover border-2 border-white/[0.08] shadow-2xl"
                      />
                    ) : (
                      <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-[#00E6A7]/15 border border-[#00E6A7]/20 text-2xl font-bold text-[#00E6A7]">
                        {initials}
                      </div>
                    )}
                  </motion.div>

                  {/* Name + title */}
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.5 }}
                    className="text-center mb-8"
                  >
                    <h1 className="font-['Inter_Tight'] text-2xl font-bold text-white">{name}</h1>
                    {title && <p className="mt-1 text-[#00E6A7] font-medium">{title}</p>}
                    {dept && (
                      <span className="mt-3 inline-block rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-1 text-xs text-[#9CA3AF]">
                        {dept}
                      </span>
                    )}
                  </motion.div>

                  {/* Detail fields */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4, duration: 0.5 }}
                    className="space-y-3"
                  >
                    {displayFields.map(([key, value], i) => (
                      <motion.div
                        key={key}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.45 + i * 0.06 }}
                        className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3"
                      >
                        <span className="text-xs text-[#9CA3AF]">{key}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-white max-w-[180px] truncate text-right">
                            {String(value)}
                          </span>
                          {key.toLowerCase() === "email" && (
                            <a href={`mailto:${value}`} className="text-[#9CA3AF] hover:text-[#00E6A7] transition-colors">
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                </div>

                {/* Bottom gradient */}
                <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
              </div>

              {/* Metadata */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="mt-4 flex items-center justify-between px-1"
              >
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-[#00E6A7]" />
                  <span className="text-xs text-[#9CA3AF]">
                    {data.mode === "snapshot" ? "Snapshot" : "Live"} · Verified
                  </span>
                </div>
                <span className="text-xs text-[#9CA3AF]">Powered by DataVault</span>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
