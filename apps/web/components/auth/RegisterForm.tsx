"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, Lock, User, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { auth, setTokens } from "@/lib/api";
import { useRouter } from "next/navigation";

interface RegisterFormProps {
  onSwitch: (mode: "login") => void;
}

export function RegisterForm({ onSwitch }: RegisterFormProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    try {
      await auth.signup(email, password, name);
      const res = await auth.login(email, password);
      setTokens(res.data.access_token, res.data.refresh_token);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div
      key="register"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="mb-8">
        <h2 className="font-['Inter_Tight'] text-2xl font-semibold text-white">Create account</h2>
        <p className="mt-1.5 text-sm text-[#9CA3AF]">Start transforming data into experiences</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          id="name"
          label="Full name"
          type="text"
          placeholder="Akshay Santhosh"
          value={name}
          onChange={(e) => setName(e.target.value)}
          icon={<User className="h-4 w-4" />}
          required
          autoComplete="name"
        />
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
        <Input
          id="password"
          label="Password"
          type="password"
          placeholder="Min. 8 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          icon={<Lock className="h-4 w-4" />}
          required
          autoComplete="new-password"
        />

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
          Create account
          <ArrowRight className="h-4 w-4" />
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-[#9CA3AF]">
        Already have an account?{" "}
        <button
          onClick={() => onSwitch("login")}
          className="text-[#00E6A7] hover:text-[#00E6A7]/80 transition-colors duration-200 font-medium"
        >
          Sign in
        </button>
      </p>
    </motion.div>
  );
}
