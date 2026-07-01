"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, ArrowLeft, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface ForgotFormProps {
  onSwitch: (mode: "login") => void;
}

export function ForgotForm({ onSwitch }: ForgotFormProps) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // In a real app, call the API. For now, simulate success.
    setSent(true);
  }

  return (
    <motion.div
      key="forgot"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
    >
      <button
        onClick={() => onSwitch("login")}
        className="mb-6 flex items-center gap-1.5 text-sm text-[#9CA3AF] hover:text-white transition-colors duration-200"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to sign in
      </button>

      {sent ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#00E6A7]/10">
            <CheckCircle className="h-7 w-7 text-[#00E6A7]" />
          </div>
          <h2 className="font-['Inter_Tight'] text-2xl font-semibold text-white">Check your email</h2>
          <p className="mt-2 text-sm text-[#9CA3AF]">
            We&apos;ve sent reset instructions to{" "}
            <span className="text-white">{email}</span>
          </p>
          <Button
            variant="outline"
            size="md"
            onClick={() => onSwitch("login")}
            className="mt-6 w-full"
          >
            Back to sign in
          </Button>
        </motion.div>
      ) : (
        <>
          <div className="mb-8">
            <h2 className="font-['Inter_Tight'] text-2xl font-semibold text-white">Reset password</h2>
            <p className="mt-1.5 text-sm text-[#9CA3AF]">
              Enter your email and we&apos;ll send reset instructions
            </p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              id="email"
              label="Email"
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              icon={<Mail className="h-4 w-4" />}
              required
            />
            <Button type="submit" size="lg" className="w-full">
              Send reset link
            </Button>
          </form>
        </>
      )}
    </motion.div>
  );
}
