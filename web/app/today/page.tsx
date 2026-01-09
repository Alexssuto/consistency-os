"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

type Checkin = {
  sleep_hours: number | null;
  soreness: number | null;
  stress: number | null;
  mood: number | null;
  notes: string;
};

function todayISODate() {
  return new Date().toISOString().slice(0, 10); 
}

function numOrNull(v: string) {
  if (v.trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export default function TodayPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const date = useMemo(() => todayISODate(), []);


  const [form, setForm] = useState<Checkin>({
    sleep_hours: null,
    soreness: null,
    stress: null,
    mood: null,
    notes: "",
  });
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);


  const [trainMsg, setTrainMsg] = useState<string | null>(null);
  const [training, setTraining] = useState({
    activityPreset: "strength", 
    activityCustom: "",
    category: "moderate", 
    duration_min: "",
    rpe: "",
    notes: "",
  });


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

  async function saveCheckin() {
    setSaving(true);
    setMsg(null);

    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) {
      setSaving(false);
      return router.push("/login");
    }

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

  function resolveActivity() {
    if (training.activityPreset !== "other") return training.activityPreset;
    const trimmed = training.activityCustom.trim();
    return trimmed.length ? trimmed.toLowerCase() : "other";
  }

  async function addTrainingSession() {
    setTrainMsg(null);

    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) return router.push("/login");

    const duration = training.duration_min.trim() ? Number(training.duration_min) : null;
    const rpe = training.rpe.trim() ? Number(training.rpe) : null;

    if (!duration || duration <= 0) return setTrainMsg("Duration must be > 0.");
    if (!rpe || rpe < 1 || rpe > 10) return setTrainMsg("RPE must be 1–10.");

    const load = duration * rpe;

    const { error } = await supabase.from("training_sessions").insert({
      user_id: user.id,
      date,
      activity: resolveActivity(),
      category: training.category,
      duration_min: duration,
      rpe,
      load,
      notes: training.notes,
    });

    if (error) setTrainMsg(error.message);
    else {
      setTrainMsg("Training saved ✅");
      setTraining((t) => ({ ...t, duration_min: "", rpe: "", notes: "" }));
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div className="min-h-screen p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold">Today</h1>
          <p className="mt-1 text-black/70 dark:text-white/70">
            {date} · {email ?? "..."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push("/training")}
            className="rounded-lg border border-black/10 dark:border-white/10 px-3 py-2 hover:bg-black/5 dark:hover:bg-white/10"
          >
            Training
          </button>
          <button
            onClick={() => router.push("/insights")}
            className="rounded-lg border border-black/10 dark:border-white/10 px-3 py-2 hover:bg-black/5 dark:hover:bg-white/10"
          >
            Insights
          </button>
          <button
            onClick={logout}
            className="rounded-lg border border-black/10 dark:border-white/10 px-3 py-2 hover:bg-black/5 dark:hover:bg-white/10"
          >
            Log out
          </button>
        </div>
      </div>

      {/* Check-in */}
      <div className="mt-8 rounded-2xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/5 p-6">
        <h2 className="text-xl font-bold">2-minute check-in</h2>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1">
            <span className="text-sm text-black/70 dark:text-white/70">Sleep hours</span>
            <input
              className="rounded-lg border border-black/10 dark:border-white/10 bg-transparent px-3 py-2"
              value={form.sleep_hours ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, sleep_hours: numOrNull(e.target.value) }))}
              placeholder="e.g. 7.5"
            />
          </label>

          <label className="grid gap-1">
            <span className="text-sm text-black/70 dark:text-white/70">Soreness (1–5)</span>
            <input
              className="rounded-lg border border-black/10 dark:border-white/10 bg-transparent px-3 py-2"
              value={form.soreness ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, soreness: numOrNull(e.target.value) }))}
              placeholder="1..5"
            />
          </label>

          <label className="grid gap-1">
            <span className="text-sm text-black/70 dark:text-white/70">Stress (1–5)</span>
            <input
              className="rounded-lg border border-black/10 dark:border-white/10 bg-transparent px-3 py-2"
              value={form.stress ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, stress: numOrNull(e.target.value) }))}
              placeholder="1..5"
            />
          </label>

          <label className="grid gap-1">
            <span className="text-sm text-black/70 dark:text-white/70">Mood (1–5)</span>
            <input
              className="rounded-lg border border-black/10 dark:border-white/10 bg-transparent px-3 py-2"
              value={form.mood ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, mood: numOrNull(e.target.value) }))}
              placeholder="1..5"
            />
          </label>
        </div>

        <label className="mt-4 grid gap-1">
          <span className="text-sm text-black/70 dark:text-white/70">Notes</span>
          <textarea
            className="min-h-[100px] rounded-lg border border-black/10 dark:border-white/10 bg-transparent px-3 py-2"
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            placeholder="Anything important? fatigue, pain, burnout, etc."
          />
        </label>

        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={saveCheckin}
            disabled={saving}
            className="rounded-lg bg-black text-white dark:bg-white dark:text-black font-semibold px-4 py-2 disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save check-in"}
          </button>
          {msg && <p className="text-sm text-black/70 dark:text-white/70">{msg}</p>}
        </div>
      </div>

      {/* Training quick log */}
      <div className="mt-6 rounded-2xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/5 p-6">
        <h2 className="text-xl font-bold">Quick activity log</h2>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1">
            <span className="text-sm text-black/70 dark:text-white/70">Activity</span>
            <select
              className="rounded-lg border border-black/10 dark:border-white/10 bg-transparent px-3 py-2"
              value={training.activityPreset}
              onChange={(e) => setTraining((t) => ({ ...t, activityPreset: e.target.value }))}
            >
              <option value="strength">strength</option>
              <option value="cardio">cardio</option>
              <option value="sport_practice">sport practice</option>
              <option value="mobility">mobility</option>
              <option value="other">other</option>
            </select>
          </label>

          {training.activityPreset === "other" && (
            <label className="grid gap-1">
              <span className="text-sm text-black/70 dark:text-white/70">Custom activity</span>
              <input
                className="rounded-lg border border-black/10 dark:border-white/10 bg-transparent px-3 py-2"
                value={training.activityCustom}
                onChange={(e) => setTraining((t) => ({ ...t, activityCustom: e.target.value }))}
                placeholder="e.g. basketball, yoga, swim"
              />
            </label>
          )}

          <label className="grid gap-1">
            <span className="text-sm text-black/70 dark:text-white/70">Category</span>
            <select
              className="rounded-lg border border-black/10 dark:border-white/10 bg-transparent px-3 py-2"
              value={training.category}
              onChange={(e) => setTraining((t) => ({ ...t, category: e.target.value }))}
            >
              <option value="easy">easy</option>
              <option value="moderate">moderate</option>
              <option value="hard">hard</option>
              <option value="recovery">recovery</option>
              <option value="competition">competition</option>
            </select>
          </label>

          <label className="grid gap-1">
            <span className="text-sm text-black/70 dark:text-white/70">Duration (min)</span>
            <input
              className="rounded-lg border border-black/10 dark:border-white/10 bg-transparent px-3 py-2"
              value={training.duration_min}
              onChange={(e) => setTraining((t) => ({ ...t, duration_min: e.target.value }))}
              placeholder="e.g. 90"
            />
          </label>

          <label className="grid gap-1">
            <span className="text-sm text-black/70 dark:text-white/70">RPE (1–10)</span>
            <input
              className="rounded-lg border border-black/10 dark:border-white/10 bg-transparent px-3 py-2"
              value={training.rpe}
              onChange={(e) => setTraining((t) => ({ ...t, rpe: e.target.value }))}
              placeholder="e.g. 7"
            />
          </label>
        </div>

        <label className="mt-3 grid gap-1">
          <span className="text-sm text-black/70 dark:text-white/70">Notes</span>
          <input
            className="rounded-lg border border-black/10 dark:border-white/10 bg-transparent px-3 py-2"
            value={training.notes}
            onChange={(e) => setTraining((t) => ({ ...t, notes: e.target.value }))}
            placeholder="e.g. felt heavy, knee tight, great session"
          />
        </label>

        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={addTrainingSession}
            className="rounded-lg bg-black text-white dark:bg-white dark:text-black font-semibold px-4 py-2"
          >
            Save activity
          </button>
          {trainMsg && <p className="text-sm text-black/70 dark:text-white/70">{trainMsg}</p>}
        </div>
      </div>
    </div>
  );
}
