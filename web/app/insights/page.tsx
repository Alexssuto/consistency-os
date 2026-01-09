"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

type Row = {
  date: string;
  sleep_hours: number | null;
  soreness: number | null;
  stress: number | null;
  mood: number | null;
};

function clamp(n: number, a = 0, b = 100) {
  return Math.max(a, Math.min(b, n));
}

function computeScore(r: Row | null) {
  if (!r) return { score: 0, health: 0, mind: 0, finance: 0, flags: [] as string[] };

  let health = 0;
  const flags: string[] = [];

  if (r.sleep_hours != null) {
    const sleepPts = clamp((r.sleep_hours / 7.5) * 25, 0, 25);
    health += sleepPts;
    if (r.sleep_hours < 6) flags.push("Low sleep");
  }
  if (r.soreness != null) {
    const sorenessPts = clamp((6 - r.soreness) * 3, 0, 15);
    health += sorenessPts;
    if (r.soreness >= 4) flags.push("High soreness");
  }
  health = clamp(health, 0, 40);

  let mind = 0;
  if (r.mood != null) mind += clamp((r.mood / 5) * 15, 0, 15);
  if (r.stress != null) {
    mind += clamp(((6 - r.stress) / 5) * 15, 0, 15);
    if (r.stress >= 4) flags.push("High stress");
  }
  mind = clamp(mind, 0, 30);

  const finance = 15;

  const score = clamp(Math.round(health + mind + finance), 0, 100);
  return { score, health: Math.round(health), mind: Math.round(mind), finance, flags };
}

function computeStreak(dates: string[]) {

  const set = new Set(dates);
  let streak = 0;
  let d = new Date();
  while (true) {
    const iso = d.toISOString().slice(0, 10);
    if (!set.has(iso)) break;
    streak += 1;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

export default function InsightsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return router.push("/login");
      setEmail(userData.user.email ?? null);

      const since = new Date();
      since.setDate(since.getDate() - 29);
      const sinceISO = since.toISOString().slice(0, 10);

      const { data, error } = await supabase
        .from("daily_checkins")
        .select("date,sleep_hours,soreness,stress,mood")
        .gte("date", sinceISO)
        .order("date", { ascending: false });

      if (error) {
        console.error(error);
        return;
      }
      setRows((data as Row[]) ?? []);
    })();
  }, [router]);

  const todayISO = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const todayRow = rows.find((r) => r.date === todayISO) ?? null;
  const scoreObj = useMemo(() => computeScore(todayRow), [todayRow]);

  const streak = useMemo(() => computeStreak(rows.map((r) => r.date)), [rows]);

  return (
    <div className="min-h-screen p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold">Insights</h1>
          <p className="mt-1 text-black/70 dark:text-white/70">{email ?? "..."}</p>
        </div>
        <button
          onClick={() => router.push("/today")}
          className="rounded-lg border border-black/10 dark:border-white/10 px-3 py-2 hover:bg-black/5 dark:hover:bg-white/10"
        >
          Back to Today
        </button>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/5 p-6">
          <div className="text-sm text-black/70 dark:text-white/70">Today’s Score</div>
          <div className="mt-2 text-4xl font-extrabold">{scoreObj.score}</div>
          <div className="mt-2 text-xs text-black/60 dark:text-white/60">
            Health {scoreObj.health}/40 · Mind {scoreObj.mind}/30 · Finance {scoreObj.finance}/30
          </div>
        </div>

        <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/5 p-6">
          <div className="text-sm text-black/70 dark:text-white/70">Streak</div>
          <div className="mt-2 text-4xl font-extrabold">{streak}🔥</div>
          <div className="mt-2 text-xs text-black/60 dark:text-white/60">
            Consecutive days logged
          </div>
        </div>

        <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/5 p-6">
          <div className="text-sm text-black/70 dark:text-white/70">Flags</div>
          <ul className="mt-3 space-y-1 text-sm">
            {scoreObj.flags.length ? (
              scoreObj.flags.map((f) => (
                <li key={f} className="text-red-500">
                  • {f}
                </li>
              ))
            ) : (
              <li className="text-green-600">• No flags</li>
            )}
          </ul>
        </div>
      </div>

      <div className="mt-8 rounded-2xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/5 p-6">
        <h2 className="text-xl font-bold">Last 30 days</h2>
        <div className="mt-4 grid gap-2">
          {rows.length === 0 && (
            <p className="text-black/70 dark:text-white/70">No check-ins yet.</p>
          )}
          {rows.map((r) => {
            const s = computeScore(r).score;
            return (
              <div
                key={r.date}
                className="flex items-center justify-between rounded-lg border border-black/10 dark:border-white/10 px-3 py-2"
              >
                <div className="text-sm">{r.date}</div>
                <div className="text-sm font-semibold">{s}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
