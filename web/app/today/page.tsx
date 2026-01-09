"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

type Checkin = {
  sleep_hours: number | null;
  soreness: number | null;
  stress: number | null;
  mood: number | null;
  notes: string | null;
};

function todayISODate() {
  return new Date().toISOString().slice(0, 10); 
}

export default function TodayPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [date] = useState<string>(todayISODate());

  const [form, setForm] = useState<Checkin>({
    sleep_hours: null,
    soreness: null,
    stress: null,
    mood: null,
    notes: "",
  });

  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);


  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return router.push("/login");
      setEmail(userData.user.email ?? null);

      const { data, error } = await supabase
        .from("daily_checkins")
        .select("sleep_hours,soreness,stress,mood,notes")
        .eq("user_id", userData.user.id)
        .eq("date", date)
        .maybeSingle();

      if (!error && data) {
        setForm({
          sleep_hours: data.sleep_hours ?? null,
          soreness: data.soreness ?? null,
          stress: data.stress ?? null,
          mood: data.mood ?? null,
          notes: data.notes ?? "",
        });
      }
    })();
  }, [router, date]);

  async function save() {
    setSaving(true);
    setMsg(null);

    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) {
      setSaving(false);
      return router.push("/login");
    }

    // upsert by (user_id, date)
    const { error } = await supabase.from("daily_checkins").upsert(
      {
        user_id: user.id,
        date,
        sleep_hours: form.sleep_hours,
        soreness: form.soreness,
        stress: form.stress,
        mood: form.mood,
        notes: form.notes,
      },
      { onConflict: "user_id,date" }
    );

    setSaving(false);
    if (error) setMsg(error.message);
    else setMsg("Saved ✅");
  }

  async function logout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  function numOrNull(v: string) {
    if (v.trim() === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  return (
    <div className="min-h-screen p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold">Today</h1>
          <p className="mt-1 text-black/70 dark:text-white/70">
            {date} · {email ?? "..."}
          </p>
        </div>
        <button
          onClick={logout}
          className="rounded-lg border border-black/10 dark:border-white/10 px-3 py-2 hover:bg-black/5 dark:hover:bg-white/10"
        >
          Log out
        </button>
      </div>

      <div className="mt-8 rounded-2xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/5 p-6">
        <h2 className="text-xl font-bold">2-minute check-in</h2>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1">
            <span className="text-sm text-black/70 dark:text-white/70">
              Sleep hours
            </span>
            <input
              className="rounded-lg border border-black/10 dark:border-white/10 bg-transparent px-3 py-2"
              value={form.sleep_hours ?? ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, sleep_hours: numOrNull(e.target.value) }))
              }
              placeholder="e.g. 7.5"
            />
          </label>

          <label className="grid gap-1">
            <span className="text-sm text-black/70 dark:text-white/70">
              Soreness (1–5)
            </span>
            <input
              className="rounded-lg border border-black/10 dark:border-white/10 bg-transparent px-3 py-2"
              value={form.soreness ?? ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, soreness: numOrNull(e.target.value) }))
              }
              placeholder="1..5"
            />
          </label>

          <label className="grid gap-1">
            <span className="text-sm text-black/70 dark:text-white/70">
              Stress (1–5)
            </span>
            <input
              className="rounded-lg border border-black/10 dark:border-white/10 bg-transparent px-3 py-2"
              value={form.stress ?? ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, stress: numOrNull(e.target.value) }))
              }
              placeholder="1..5"
            />
          </label>

          <label className="grid gap-1">
            <span className="text-sm text-black/70 dark:text-white/70">
              Mood (1–5)
            </span>
            <input
              className="rounded-lg border border-black/10 dark:border-white/10 bg-transparent px-3 py-2"
              value={form.mood ?? ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, mood: numOrNull(e.target.value) }))
              }
              placeholder="1..5"
            />
          </label>
        </div>

        <label className="mt-4 grid gap-1">
          <span className="text-sm text-black/70 dark:text-white/70">Notes</span>
          <textarea
            className="min-h-[100px] rounded-lg border border-black/10 dark:border-white/10 bg-transparent px-3 py-2"
            value={form.notes ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            placeholder="Anything important? pain, tournament prep, burnout, etc."
          />
        </label>

        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={save}
            disabled={saving}
            className="rounded-lg bg-black text-white dark:bg-white dark:text-black font-semibold px-4 py-2 disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save check-in"}
          </button>
          {msg && <p className="text-sm text-black/70 dark:text-white/70">{msg}</p>}
        </div>
      </div>
    </div>
  );
}
