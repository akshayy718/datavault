"use client";
import { motion, AnimatePresence } from "framer-motion";
import { QrCode, Download, Copy, Check } from "lucide-react";
import { useState } from "react";

interface QRPanelProps {
  token?: string;
  isGenerating: boolean;
}

const BACKEND_ORIGIN = (process.env.NEXT_PUBLIC_API_URL ?? "https://datavault-api-w0sn.onrender.com/api/v1")
  .replace("/api/v1", "");

export function QRPanel({ token, isGenerating }: QRPanelProps) {
  const [copied, setCopied] = useState(false);

  // The shareable link points to the FRONTEND recipient card (port 3000),
  // which fetches the data and renders the premium experience -- not the
  // backend's raw JSON endpoint (port 8000). At deployment this becomes
  // the real public frontend domain.
  const frontendOrigin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
  const shareUrl = token ? `${frontendOrigin}/view/${token}` : null;

  function copyLink() {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-col h-full">
      <p className="text-xs font-medium text-[#9CA3AF] uppercase tracking-wider mb-6">QR Code</p>

      {/* QR display */}
      <div className="flex flex-1 flex-col items-center justify-center gap-4">
        <AnimatePresence mode="wait">
          {isGenerating ? (
            <motion.div
              key="generating"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-3"
            >
              <div className="relative h-36 w-36 rounded-2xl border border-white/[0.08] bg-white/[0.02] flex items-center justify-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                  className="h-8 w-8 rounded-full border-2 border-[#00E6A7]/30 border-t-[#00E6A7]"
                />
              </div>
              <p className="text-xs text-[#9CA3AF]">Generating QR...</p>
            </motion.div>
          ) : token ? (
            <motion.div
              key="qr"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col items-center gap-4"
            >
              {/* Real QR image from backend */}
              <div className="relative rounded-2xl border border-[#00E6A7]/20 bg-white p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`${BACKEND_ORIGIN}/static/qr/${token}.png`}
                  alt="QR Code"
                  className="h-32 w-32"
                />
              </div>
              <p className="text-xs text-[#9CA3AF] text-center">Scan to view on any device</p>
            </motion.div>
          ) : (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="flex flex-col items-center gap-3"
            >
              <div className="h-36 w-36 rounded-2xl border-2 border-dashed border-white/[0.08] flex items-center justify-center">
                <QrCode className="h-10 w-10 text-white/10" />
              </div>
              <p className="text-xs text-[#9CA3AF]">Configure options to generate</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Actions */}
        {token && shareUrl && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-2 w-full"
          >
            <button
              onClick={copyLink}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] py-2.5 text-xs text-[#9CA3AF] hover:border-white/15 hover:text-white transition-all duration-200"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-[#00E6A7]" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied!" : "Copy link"}
            </button>
            <button
              onClick={async () => {
                // Fetch the image as a blob first, then trigger download.
                // This is needed because the `download` attribute on <a> only
                // works when the file is on the same domain as the page.
                // Since the QR is on localhost:8000 and the page is on
                // localhost:3000, we must fetch it ourselves and create a
                // temporary object URL to force the browser to download it
                // instead of just opening it in a new tab / fullscreen.
                try {
                  const res = await fetch(`${BACKEND_ORIGIN}/static/qr/${token}.png`);
                  const blob = await res.blob();
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `datavault-qr-${token}.png`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                } catch {
                  alert("Download failed. Please right-click the QR image and choose Save As.");
                }
              }}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] py-2.5 text-xs text-[#9CA3AF] hover:border-white/15 hover:text-white transition-all duration-200"
            >
              <Download className="h-3.5 w-3.5" />
              Download
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
