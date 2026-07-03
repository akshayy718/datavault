"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, Lock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";

interface LoginFormProps {
  onSwitch: (mode: "register" | "forgot") => void;
}

export function LoginForm({ onSwitch }: LoginFormProps) {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div
      key="login"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="mb-8">
        <h2 className="font-['Inter_Tight'] text-2xl font-semibold text-white">Welcome back</h2>
        <p className="mt-1.5 text-sm text-[#9CA3AF]">Sign in to your DataVault account</p>
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
          autoComplete="email"
        />
        <div>
          <Input
            id="password"
            label="Password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            icon={<Lock className="h-4 w-4" />}
            required
            autoComplete="current-password"
          />
          <button
            type="button"
            onClick={() => onSwitch("forgot")}
            className="mt-1.5 text-xs text-[#9CA3AF] hover:text-[#00E6A7] transition-colors duration-200"
          >
            Forgot password?
          </button>
        </div>

        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400"
          >
            {error}
          </motion.p>
        )}

        <Button type="submit" size="lg" loading={loading} className="w-full gap-2">
          Sign in
          <ArrowRight className="h-4 w-4" />
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-[#9CA3AF]">
        Don&apos;t have an account?{" "}
        <button
          onClick={() => onSwitch("register")}
          className="text-[#00E6A7] hover:text-[#00E6A7]/80 transition-colors duration-200 font-medium"
        >
          Create one
        </button>
      </p>
    </motion.div>
  );
}
