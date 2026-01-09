"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);

    const { error } =
      mode === "login"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });

    setLoading(false);

    if (error) return setMsg(error.message);


    router.push("/today");
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-white/5 p-6">
        <h1 className="text-2xl font-bold">
          {mode === "login" ? "Log in" : "Create account"}
        </h1>
        <p className="mt-1 text-sm text-black/60 dark:text-white/60">
          Consistency OS
        </p>

        <form onSubmit={onSubmit} className="mt-6 grid gap-3">
          <input
            className="w-full rounded-lg border border-black/10 dark:border-white/10 bg-transparent px-3 py-2"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            required
          />
          <input
            className="w-full rounded-lg border border-black/10 dark:border-white/10 bg-transparent px-3 py-2"
            placeholder="Password (min 6 chars)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            required
          />

          <button
            disabled={loading}
            className="rounded-lg bg-black text-white dark:bg-white dark:text-black font-semibold py-2 disabled:opacity-60"
          >
            {loading ? "..." : mode === "login" ? "Log in" : "Sign up"}
          </button>

          {msg && <p className="text-red-500 text-sm">{msg}</p>}
        </form>

        <button
          onClick={() => setMode(mode === "login" ? "signup" : "login")}
          className="mt-4 text-sm underline text-black/70 dark:text-white/70"
        >
          {mode === "login"
            ? "Need an account? Sign up"
            : "Already have an account? Log in"}
        </button>
      </div>
    </div>
  );
}
