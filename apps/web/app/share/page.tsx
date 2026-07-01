"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { RecipientPreview } from "@/components/share/RecipientPreview";
import { ShareOptionsPanel, ShareOptions } from "@/components/share/ShareOptionsPanel";
import { QRPanel } from "@/components/share/QRPanel";
import { Button } from "@/components/ui/Button";

const DEMO_SELECTED = {
  name: "Aisha Rahman",
  title: "Senior Engineer",
  department: "Engineering",
  email: "aisha.rahman@example.com",
  photo: "https://i.pravatar.cc/150?img=1",
};

export default function SharePage() {
  const router = useRouter();
  const [options, setOptions] = useState<ShareOptions>({
    mode: "snapshot",
    theme: "default",
    pin: "",
    expiresIn: "",
    maxViews: "",
  });
  const [generating, setGenerating] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function handleGenerate() {
    setGenerating(true);
    setError("");
    setToken(null);

    await new Promise(r => setTimeout(r, 800));

    // In demo mode, generate a mock token without hitting the backend
    const mockToken = `demo_${Math.random().toString(36).slice(2, 10)}`;
    setToken(mockToken);
    setGenerating(false);
  }

  return (
    <div className="min-h-screen bg-[#08090A] flex flex-col">
      <Navbar />

      <main className="flex flex-1 overflow-hidden">
        {/* ── LEFT: Recipient preview ── */}
        <div className="w-72 shrink-0 border-r border-white/[0.06] px-6 py-6 overflow-y-auto">
          <RecipientPreview selectedData={DEMO_SELECTED} theme={options.theme} />
        </div>

        {/* ── CENTER: Options ── */}
        <div className="flex flex-1 flex-col overflow-y-auto">
          {/* Header */}
          <div className="border-b border-white/[0.06] px-8 py-5">
            <div className="flex items-center gap-2 text-xs text-[#9CA3AF] mb-3">
              <span className="text-[#00E6A7]">Select</span>
              <span>/</span>
              <span className="text-white font-medium">Configure share</span>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <h1 className="font-['Inter_Tight'] text-2xl font-bold text-white">Create Share</h1>
                <p className="text-sm text-[#9CA3AF] mt-1">Configure how recipients will experience your data</p>
              </div>
              {/* Selection summary */}
              <div className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-2">
                <div className="h-2 w-2 rounded-full bg-[#00E6A7]" />
                <span className="text-xs text-white">1 row selected</span>
                <button
                  onClick={() => router.push("/select")}
                  className="text-xs text-[#9CA3AF] hover:text-white transition-colors ml-1"
                >
                  Change
                </button>
              </div>
            </div>
          </div>

          {/* Options body */}
          <div className="flex-1 px-8 py-6">
            <ShareOptionsPanel options={options} onChange={setOptions} />

            {error && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400"
              >
                {error}
              </motion.p>
            )}

            {/* Generate button */}
            <div className="mt-8 flex items-center gap-4">
              <Button
                size="lg"
                onClick={handleGenerate}
                loading={generating}
                className="gap-2"
              >
                <Sparkles className="h-4 w-4" />
                {token ? "Regenerate" : "Generate Share & QR"}
              </Button>
              {token && (
                <motion.p
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-sm text-[#00E6A7]"
                >
                  ✓ Share created
                </motion.p>
              )}
            </div>
          </div>
        </div>

        {/* ── RIGHT: Live QR ── */}
        <div className="w-64 shrink-0 border-l border-white/[0.06] px-5 py-6 overflow-y-auto">
          <QRPanel token={token ?? undefined} isGenerating={generating} />
        </div>
      </main>
    </div>
  );
}
