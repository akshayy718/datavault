"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, CheckCircle2, ExternalLink, Share2, Bookmark, BookmarkCheck, Users } from "lucide-react";
import { Button } from "@/components/ui/Button";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ViewData {
  mode: string;
  captured_at?: string | null;
  format: string;
  data:
    | { kind: "single"; fields: Record<string, string> }
    | { kind: "multi";  items: Record<string, string>[] };
}

const API_ORIGIN = (process.env.NEXT_PUBLIC_API_URL ?? "https://datavault-api-w0sn.onrender.com/api/v1")
  .replace("/api/v1", "");

// ─── Data fetching hook ───────────────────────────────────────────────────────
function useViewData(token: string) {
  const [data, setData]       = useState<ViewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [locked, setLocked]   = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [slowWarning, setSlowWarning] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  // Lets the user manually retry if the request failed or timed out.
  function retry() {
    setErrorMsg(null);
    setLoading(true);
    setSlowWarning(false);
    setReloadKey(k => k + 1);
  }

  useEffect(() => {
    // "AbortController" lets us cancel a fetch that takes too long.
    // Without this, a slow server can leave the phone waiting forever.
    const controller = new AbortController();

    // After 6 seconds of waiting, show a friendly "server is waking up" note
    // so the user knows the app isn't frozen — it's just a slow free server.
    const slowTimer = setTimeout(() => setSlowWarning(true), 6000);

    // After 45 seconds, give up and show a retry button instead of hanging.
    const abortTimer = setTimeout(() => controller.abort(), 45000);

    async function load() {
      try {
        const res = await fetch(`${API_ORIGIN}/view/${token}`, { signal: controller.signal });
        if (res.ok) {
          const json = await res.json();
          setData(json.data ?? json);
        } else if (res.status === 401) {
          setLocked(true);
        } else if (res.status === 410) {
          setErrorMsg("This share is no longer available (expired, revoked, or view limit reached).");
        } else if (res.status === 404) {
          setErrorMsg("This link doesn't exist.");
        } else {
          const j = await res.json().catch(() => null);
          setErrorMsg(j?.detail ?? "Something went wrong loading this share.");
        }
      } catch (err) {
        // A timeout (abort) or network failure both land here.
        if (err instanceof Error && err.name === "AbortError") {
          setErrorMsg("The server is taking too long to respond. It may be waking up — please try again.");
        } else {
          setErrorMsg("Couldn't reach the server. Please check your connection and try again.");
        }
      } finally {
        clearTimeout(slowTimer);
        clearTimeout(abortTimer);
        setLoading(false);
        setSlowWarning(false);
      }
    }
    load();

    // Cleanup if the component unmounts mid-request
    return () => {
      clearTimeout(slowTimer);
      clearTimeout(abortTimer);
      controller.abort();
    };
  }, [token, reloadKey]);

  return { data, loading, locked, setLocked, setData, errorMsg, slowWarning, retry };
}

// ─── Single-row card ──────────────────────────────────────────────────────────
// This is the premium "one person" view — big avatar, name, title, then fields.
function SingleCard({ fields, mode }: { fields: Record<string, string>; mode: string }) {
  const photoUrl = fields.Photo ?? fields.photo ?? null;
  const name     = fields.Name  ?? fields.name  ?? "—";
  const title    = fields.Title ?? fields.title  ?? null;
  const dept     = fields.Department ?? fields.department ?? null;
  const initials = name.split(" ").map((w: string) => w[0]).slice(0, 2).join("");

  // Show everything except the ones we display prominently above
  const displayFields = Object.entries(fields).filter(
    ([k]) => !["Photo","photo","Name","name","Title","title"].includes(k)
  );

  return (
    <div className="relative rounded-3xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-sm overflow-hidden">
      {/* Top accent line */}
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
            <img src={photoUrl} alt={name} className="h-24 w-24 rounded-2xl object-cover border-2 border-white/[0.08] shadow-2xl" />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-[#00E6A7]/15 border border-[#00E6A7]/20 text-2xl font-bold text-[#00E6A7]">
              {initials}
            </div>
          )}
        </motion.div>

        {/* Name + title + department */}
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
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
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="space-y-3">
          {displayFields.map(([key, value], i) => (
            <motion.div
              key={key}
              initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.45 + i * 0.06 }}
              className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3"
            >
              <span className="text-xs text-[#9CA3AF] shrink-0">{key}</span>
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm text-white max-w-[180px] truncate text-right">{String(value)}</span>
                {key.toLowerCase() === "email" && (
                  <a href={`mailto:${value}`} className="text-[#9CA3AF] hover:text-[#00E6A7] transition-colors shrink-0">
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Bottom accent line */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
    </div>
  );
}

// ─── Multi-row card ───────────────────────────────────────────────────────────
// When multiple rows are shared, show a clean list of cards — one per row.
function MultiCard({ items, mode }: { items: Record<string, string>[]; mode: string }) {
  // Detect the "primary" column for each row (Name, then first column)
  function getLabel(row: Record<string, string>) {
    return row.Name ?? row.name ?? Object.values(row)[0] ?? "—";
  }
  function getSublabel(row: Record<string, string>) {
    return row.Title ?? row.title ?? row.Department ?? row.department ?? null;
  }
  function getInitials(row: Record<string, string>) {
    return getLabel(row).split(" ").map((w: string) => w[0]).slice(0, 2).join("");
  }
  function getPhoto(row: Record<string, string>) {
    return row.Photo ?? row.photo ?? null;
  }

  const columns = items.length > 0
    ? Object.keys(items[0]).filter(k => !["Photo","photo","Name","name"].includes(k))
    : [];

  return (
    <div className="relative rounded-3xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-sm overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#00E6A7]/40 to-transparent" />

      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-white/[0.06]">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#00E6A7]/15">
          <Users className="h-4 w-4 text-[#00E6A7]" />
        </div>
        <div>
          <p className="text-sm font-semibold text-white">{items.length} Records</p>
          <p className="text-xs text-[#9CA3AF]">Shared dataset</p>
        </div>
        <span className="ml-auto text-xs rounded-full border border-[#00E6A7]/30 bg-[#00E6A7]/10 text-[#00E6A7] px-2.5 py-0.5">
          {mode === "snapshot" ? "Snapshot" : "Live"}
        </span>
      </div>

      {/* Row list */}
      <div className="divide-y divide-white/[0.04]">
        {items.map((row, i) => {
          const photo = getPhoto(row);
          const label = getLabel(row);
          const sub   = getSublabel(row);
          const inits = getInitials(row);
          const extra = Object.entries(row).filter(
            // Hide Photo (shown as avatar) and Name (shown as row header label).
            // Show EVERYTHING else — Department, Title, Email, Location, Salary, etc.
            // This is especially important for column-mode shares where the user
            // deliberately selected specific columns and expects to see them all.
            ([k]) => !["Photo", "photo", "Name", "name"].includes(k)
          );

          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.05, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="px-6 py-4"
            >
              {/* Row header */}
              <div className="flex items-center gap-3 mb-3">
                {photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={photo}
                    alt={label}
                    className="h-9 w-9 rounded-xl object-cover border border-white/[0.08] shrink-0"
                    onError={(e) => {
                      // If photo URL fails, show initials instead
                      const el = e.currentTarget;
                      el.style.display = "none";
                      const parent = el.parentElement;
                      if (parent) {
                        const div = document.createElement("div");
                        div.className = "flex h-9 w-9 items-center justify-center rounded-xl bg-[#00E6A7]/15 text-xs font-semibold text-[#00E6A7] shrink-0";
                        div.textContent = inits;
                        parent.appendChild(div);
                      }
                    }}
                  />
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#00E6A7]/15 text-xs font-semibold text-[#00E6A7] shrink-0">
                    {inits}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate">{label}</p>
                  {sub && <p className="text-xs text-[#9CA3AF] truncate">{sub}</p>}
                </div>
                <span className="ml-auto text-xs text-[#9CA3AF] font-['Space_Grotesk'] shrink-0">#{i + 1}</span>
              </div>

              {/* Field pills */}
              {extra.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  {extra.map(([key, value]) => (
                    <div key={key} className="rounded-lg border border-white/[0.05] bg-white/[0.02] px-3 py-2">
                      <p className="text-[10px] text-[#9CA3AF] mb-0.5">{key}</p>
                      <div className="flex items-center gap-1">
                        <p className="text-xs text-white truncate">{String(value) || "—"}</p>
                        {key.toLowerCase() === "email" && (
                          <a href={`mailto:${value}`} className="text-[#9CA3AF] hover:text-[#00E6A7] transition-colors shrink-0">
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
interface RecipientPageProps {
  params: { token: string };
}

export default function RecipientPage({ params }: RecipientPageProps) {
  const { data, loading, locked, setLocked, setData, errorMsg, slowWarning, retry } = useViewData(params.token);
  const [pin, setPin]           = useState("");
  const [pinError, setPinError] = useState("");
  const [unlocking, setUnlocking] = useState(false);
  const [saved, setSaved]       = useState(false);
  const [copied, setCopied]     = useState(false);

  // Determine whether this is single or multi
  const kind  = data?.data?.kind;
  const items = kind === "multi"  ? (data!.data as { kind: "multi"; items: Record<string, string>[] }).items : null;
  const fields= kind === "single" ? (data!.data as { kind: "single"; fields: Record<string, string> }).fields : null;

  async function handleUnlock(e: React.FormEvent) {
    e.preventDefault();
    setPinError("");
    setUnlocking(true);

    // Give the unlock request a 45-second limit so the page never appears
    // frozen while typing/submitting the PIN on a slow connection.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 45000);

    try {
      const res = await fetch(`${API_ORIGIN}/view/${params.token}/unlock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
        signal: controller.signal,
      });
      if (res.ok) {
        const json = await res.json();
        setData(json.data ?? json);
        setLocked(false);
      } else {
        setPinError("Incorrect PIN. Please try again.");
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        setPinError("The server took too long. Please try again.");
      } else {
        setPinError("Couldn't reach the server. Please try again.");
      }
    } finally {
      clearTimeout(timer);
      setUnlocking(false);
    }
  }

  function copyLink() {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="min-h-screen bg-[#08090A] flex flex-col">
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 h-[500px] w-[800px] rounded-full bg-[#00E6A7]/4 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-64 w-64 rounded-full bg-[#5BE7FF]/3 blur-[100px]" />
      </div>

      <AnimatePresence mode="wait">

        {/* ── Loading ── */}
        {loading && (
          <motion.div key="loading"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex flex-1 flex-col items-center justify-center min-h-screen gap-4 px-6 text-center"
          >
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
              className="h-8 w-8 rounded-full border-2 border-[#00E6A7]/20 border-t-[#00E6A7]" />
            <p className="text-sm text-[#9CA3AF]">Loading experience...</p>
            {/* Shown only after 6 seconds, so the user knows it's a slow server, not a frozen page */}
            {slowWarning && (
              <motion.p
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="text-xs text-[#9CA3AF]/70 max-w-xs"
              >
                The server is waking up — this can take up to a minute on the first visit. Thanks for your patience.
              </motion.p>
            )}
          </motion.div>
        )}

        {/* ── Error ── */}
        {!loading && !locked && errorMsg && (
          <motion.div key="error"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex flex-1 flex-col items-center justify-center min-h-screen px-6"
          >
            <div className="w-full max-w-sm text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.03] border border-white/[0.08]">
                <Lock className="h-6 w-6 text-[#9CA3AF]" />
              </div>
              <h1 className="font-['Inter_Tight'] text-xl font-semibold text-white">Unavailable</h1>
              <p className="mt-2 text-sm text-[#9CA3AF]">{errorMsg}</p>
              {/* Retry button — lets the user try again without reloading the whole page */}
              <button
                onClick={retry}
                className="mt-5 rounded-xl bg-[#00E6A7] px-5 py-2.5 text-sm font-medium text-[#08090A] hover:bg-[#00E6A7]/90 transition-colors"
              >
                Try again
              </button>
              <p className="mt-6 text-xs text-[#9CA3AF]">Powered by DataVault</p>
            </div>
          </motion.div>
        )}

        {/* ── PIN gate ── */}
        {!loading && locked && (
          <motion.div key="locked"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
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
                <input type="text" inputMode="numeric" value={pin} onChange={e => setPin(e.target.value)}
                  placeholder="Enter PIN" maxLength={8}
                  className="h-14 w-full rounded-2xl border border-white/[0.08] bg-white/[0.03] px-5 text-center text-lg tracking-widest text-white placeholder:text-[#9CA3AF]/30 focus:border-[#00E6A7]/50 focus:outline-none focus:ring-2 focus:ring-[#00E6A7]/15 transition-all"
                />
                {pinError && <p className="text-sm text-red-400 text-center">{pinError}</p>}
                <Button type="submit" size="lg" loading={unlocking} className="w-full">Unlock</Button>
              </form>
              <p className="mt-6 text-center text-xs text-[#9CA3AF]">Powered by DataVault</p>
            </div>
          </motion.div>
        )}

        {/* ── Content ── */}
        {!loading && !locked && data && (
          <motion.div key="content"
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
                <button onClick={copyLink}
                  className="flex h-8 items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 text-xs text-[#9CA3AF] hover:text-white transition-colors"
                >
                  <Share2 className="h-3.5 w-3.5" />
                  {copied ? "Copied!" : "Share"}
                </button>
                <button onClick={() => setSaved(!saved)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-[#9CA3AF] hover:text-white transition-colors"
                >
                  {saved ? <BookmarkCheck className="h-3.5 w-3.5 text-[#00E6A7]" /> : <Bookmark className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>

            {/* Card — single or multi */}
            <motion.div
              initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-lg mt-14"
            >
              {kind === "single" && fields && (
                <SingleCard fields={fields} mode={data.mode} />
              )}
              {kind === "multi" && items && (
                <MultiCard items={items} mode={data.mode} />
              )}

              {/* Footer */}
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}
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
