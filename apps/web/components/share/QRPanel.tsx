"use client";
import { motion, AnimatePresence } from "framer-motion";
import { QrCode, Download, Copy, Check } from "lucide-react";
import { useState } from "react";

interface QRPanelProps {
  token?: string;
  isGenerating: boolean;
}

export function QRPanel({ token, isGenerating }: QRPanelProps) {
  const [copied, setCopied] = useState(false);

  const shareUrl = token ? `http://localhost:8000/view/${token}` : null;

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
              {/* QR image from backend */}
              <div className="relative rounded-2xl border border-[#00E6A7]/20 bg-white p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`http://localhost:8000/static/qr/${token}.png`}
                  alt="QR Code"
                  className="h-32 w-32"
                  onError={(e) => {
                    // Fallback: show a mock QR grid if backend isn't connected
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
                {/* Fallback mock QR */}
                <div className="h-32 w-32 grid grid-cols-7 gap-[2px] p-1 absolute inset-3">
                  {Array.from({ length: 49 }).map((_, i) => {
                    const corners = [0,1,2,3,4,5,6,7,13,14,20,21,27,28,29,30,31,32,33,34,35,41,42,48];
                    const isDark = corners.includes(i) || Math.random() > 0.55;
                    return (
                      <div key={i} className="rounded-[1px]" style={{ background: isDark ? "#08090A" : "transparent" }} />
                    );
                  })}
                </div>
                {/* Corner marks */}
                <div className="absolute top-4 left-4 h-6 w-6 border-2 border-[#08090A] rounded-sm" />
                <div className="absolute top-4 right-4 h-6 w-6 border-2 border-[#08090A] rounded-sm" />
                <div className="absolute bottom-4 left-4 h-6 w-6 border-2 border-[#08090A] rounded-sm" />
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
            <a
              href={`http://localhost:8000/static/qr/${token}.png`}
              download
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] py-2.5 text-xs text-[#9CA3AF] hover:border-white/15 hover:text-white transition-all duration-200"
            >
              <Download className="h-3.5 w-3.5" />
              Download
            </a>
          </motion.div>
        )}
      </div>
    </div>
  );
}
