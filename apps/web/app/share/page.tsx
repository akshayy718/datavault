"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useFlow } from "@/hooks/useFlow";
import { RecipientPreview } from "@/components/share/RecipientPreview";
import { ShareOptionsPanel, ShareOptions } from "@/components/share/ShareOptionsPanel";
import { QRPanel } from "@/components/share/QRPanel";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { shares as sharesApi, CreateSharePayload } from "@/lib/api";

const FALLBACK_SELECTED = {
  name: "No selection",
  title: "Go back to upload",
  department: "—",
  email: "—",
  photo: undefined as string | undefined,
};

function expiryToISO(choice: string): string | undefined {
  if (!choice) return undefined;
  const now = Date.now();
  const map: Record<string, number> = {
    "1h": 3600e3, "24h": 86400e3, "7d": 7 * 86400e3, "30d": 30 * 86400e3,
  };
  const ms = map[choice];
  if (!ms) return undefined;
  return new Date(now + ms).toISOString();
}

export default function SharePage() {
  const { user, loading } = useRequireAuth();
  const router = useRouter();
  const { dataset, selection } = useFlow();
  const toast = useToast();

  const [options, setOptions] = useState<ShareOptions>({
    mode: "snapshot", theme: "default", pin: "", expiresIn: "", maxViews: "",
  });
  const [generating, setGenerating] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState("");

  const firstRow = selection?.previewRows?.[0];
  const selectedPreview = firstRow
    ? {
        name: firstRow.Name ?? firstRow.name ?? "—",
        title: firstRow.Title ?? firstRow.title,
        department: firstRow.Department ?? firstRow.department,
        email: firstRow.Email ?? firstRow.email,
        photo: firstRow.Photo ?? firstRow.photo,
      }
    : FALLBACK_SELECTED;

  const hasRealData = Boolean(dataset && selection);

  async function handleGenerate() {
    setError("");
    if (!dataset || !selection) {
      setError("No data selected. Please go back to upload and select data first.");
      return;
    }
    setGenerating(true);
    setToken(null);
    try {
      const payload: CreateSharePayload = {
        dataset_id: dataset.id,
        selection_type: selection.type,
        selection_spec: selection.spec,
        mode: options.mode,
        pin: options.pin || undefined,
        expires_at: expiryToISO(options.expiresIn),
        max_views: options.maxViews ? parseInt(options.maxViews, 10) : undefined,
      };
      const res = await sharesApi.create(payload);
      setToken(res.data.token);
      toast.success("Share created! Your QR code is ready.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to create share";
      setError(msg);
      toast.error(msg);
    } finally {
      setGenerating(false);
    }
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-[#08090A] flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-[#00E6A7]/20 border-t-[#00E6A7] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#08090A] flex flex-col">
      <Navbar />
      <main className="flex flex-col lg:flex-row flex-1 overflow-y-auto lg:overflow-hidden">
        <div className="w-full lg:w-72 shrink-0 border-b lg:border-b-0 lg:border-r border-white/[0.06] px-4 sm:px-6 py-6 lg:overflow-y-auto">
          <RecipientPreview selectedData={selectedPreview} theme={options.theme} />
        </div>

        <div className="flex flex-1 flex-col lg:overflow-y-auto">
          <div className="border-b border-white/[0.06] px-4 sm:px-8 py-5">
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
              <div className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-2">
                <div className={`h-2 w-2 rounded-full ${hasRealData ? "bg-[#00E6A7]" : "bg-[#9CA3AF]"}`} />
                <span className="text-xs text-white">
                  {hasRealData ? `${selection?.count} ${selection?.type}${(selection?.count ?? 0) !== 1 ? "s" : ""} selected` : "No selection"}
                </span>
                <button onClick={() => router.push("/dashboard")} className="text-xs text-[#9CA3AF] hover:text-white transition-colors ml-1">
                  Change
                </button>
              </div>
            </div>
          </div>

          <div className="flex-1 px-4 sm:px-8 py-6">
            {!hasRealData && (
              <div className="mb-6 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-300/90">
                No data selected yet. Head back to{" "}
                <button onClick={() => router.push("/dashboard")} className="underline hover:text-amber-200">upload</button>{" "}
                to pick your data, then return here to create a share.
              </div>
            )}

            <ShareOptionsPanel options={options} onChange={setOptions} />

            {error && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {error}
              </motion.p>
            )}

            <div className="mt-8 flex items-center gap-4">
              <Button size="lg" onClick={handleGenerate} loading={generating} disabled={!hasRealData} className="gap-2">
                <Sparkles className="h-4 w-4" />
                {token ? "Regenerate" : "Generate Share & QR"}
              </Button>
              {token && (
                <motion.p initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} className="text-sm text-[#00E6A7]">
                  ✓ Share created
                </motion.p>
              )}
            </div>
          </div>
        </div>

        <div className="w-full lg:w-64 shrink-0 border-t lg:border-t-0 lg:border-l border-white/[0.06] px-4 sm:px-5 py-6 lg:overflow-y-auto">
          <QRPanel token={token ?? undefined} isGenerating={generating} />
        </div>
      </main>
    </div>
  );
}
