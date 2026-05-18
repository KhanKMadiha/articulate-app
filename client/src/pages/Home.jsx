import { useMemo, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { MOODS, THEMES, PASSAGE_LENGTH_MINUTES } from "../lib/constants.js";
import { generatePassage } from "../lib/api.js";
import { clearSession, loadSession, saveSession } from "../lib/storage.js";
import { todayKey } from "../lib/dates.js";
import { requestAndSubscribe } from "../lib/notifications.js";

function readInitialFromSession() {
  const s = loadSession();
  const dk = todayKey();
  if (s?.dateKey !== dk || !s?.passage) {
    return { mood: "focused", themeMode: "surprise", themePick: THEMES[0] };
  }
  return {
    mood: s.mood || "focused",
    themeMode: s.themeMode || "surprise",
    themePick: s.themePick && THEMES.includes(s.themePick) ? s.themePick : THEMES[0],
    hasPassage: true,
  };
}

function LoadingScreen() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-paper gap-8 px-8">
      <div className="text-center space-y-2">
        <p className="font-serif text-2xl text-ink">Writing your passage…</p>
        <p className="font-sans text-sm text-inkMuted">Tailored to your voice and goals</p>
      </div>
      <div className="w-64 h-1 bg-border rounded-full overflow-hidden">
        <div
          className="h-full bg-accent rounded-full"
          style={{ animation: "loading-bar 2.8s ease-in-out infinite" }}
        />
      </div>
    </div>
  );
}

export default function Home() {
  const { profile } = useOutletContext();
  const navigate = useNavigate();
  const init = useMemo(() => readInitialFromSession(), []);

  const [mood, setMood] = useState(init.mood);
  const [themeMode, setThemeMode] = useState(init.themeMode);
  const [themePick, setThemePick] = useState(init.themePick);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const allInspirations = profile.speakingInspirations || [];
  const [selectedInspirations, setSelectedInspirations] = useState(allInspirations);
  const toggleInspiration = (name) =>
    setSelectedInspirations((prev) =>
      prev.includes(name) ? prev.filter((x) => x !== name) : [...prev, name]
    );

  const [reminderTime, setReminderTime] = useState("08:00");
  const [reminderStatus, setReminderStatus] = useState("idle");
  const [reminderExpanded, setReminderExpanded] = useState(false);
  const [reminderError, setReminderError] = useState("");
  const notificationsSupported = "Notification" in window && "serviceWorker" in navigator;
  const reminderAlreadyGranted = notificationsSupported && Notification.permission === "granted";
  const showReminderPrompt = notificationsSupported && !reminderAlreadyGranted && reminderStatus !== "on";

  const dateKey = todayKey();
  const checkinFirst = profile.readingStyle === "checkin";
  const targetReadMinutes = PASSAGE_LENGTH_MINUTES[profile.passageLength] ?? 4;
  const moodLabel = useMemo(() => MOODS.find((m) => m.id === mood)?.label || mood, [mood]);
  const today = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });

  const handleGenerate = async () => {
    setError("");
    setLoading(true);
    try {
      const surprise = checkinFirst ? themeMode === "surprise" : true;
      const data = await generatePassage({
        name: profile.name,
        role: profile.jobTitle,
        industry: profile.industry,
        goals: profile.careerGoal,
        topics: profile.focusAreas,
        inspirations: selectedInspirations.length > 0 ? selectedInspirations : profile.speakingInspirations,
        mood: checkinFirst ? moodLabel : "Ready to read — straight to the passage",
        theme: surprise ? undefined : themePick,
        surprise,
        targetReadMinutes,
        dyslexiaMode: profile.dyslexiaMode ?? false,
      });
      saveSession({ dateKey, mood, themeMode, themePick, passage: data, completedToday: false });
      navigate("/read");
    } catch (e) {
      setError(e.message || "Something went wrong.");
      setLoading(false);
    }
  };

  const handleSetReminder = async () => {
    setReminderStatus("loading");
    setReminderError("");
    try {
      await requestAndSubscribe(reminderTime);
      setReminderStatus("on");
      setReminderExpanded(false);
    } catch (e) {
      setReminderError(e.message);
      setReminderStatus("idle");
    }
  };

  if (loading) return <LoadingScreen />;

  const firstName = profile.name.split(" ")[0];

  return (
    <div className="flex-1 flex flex-col animate-fade-up">
      <div className="flex-1 flex flex-col surface p-6 sm:p-8 gap-7">

        {/* Greeting */}
        <div className="space-y-1">
          <p className="font-sans text-xs uppercase tracking-[0.2em] text-inkFaint">{today}</p>
          <h1 className="font-serif text-3xl text-ink leading-tight">Hello, {firstName}</h1>
          <p className="font-sans text-sm text-inkMuted leading-relaxed">
            {checkinFirst
              ? "A quick check-in, then today's passage."
              : `Ready when you are. ~${targetReadMinutes} min, tailored to you.`}
          </p>
        </div>

        {/* Inspiration picker */}
        {allInspirations.length > 0 && (
          <div className="space-y-2">
            <p className="font-sans text-xs uppercase tracking-[0.14em] text-inkFaint font-medium">
              Channel today
            </p>
            <div className="flex flex-wrap gap-2">
              {allInspirations.map((name) => (
                <button
                  key={name}
                  type="button"
                  data-active={selectedInspirations.includes(name)}
                  className="chip text-xs py-1.5 px-3.5"
                  onClick={() => toggleInspiration(name)}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="h-px bg-border" />

        {/* Check-in area */}
        {checkinFirst ? (
          <div className="flex-1 flex flex-col gap-5">
            {/* Mood */}
            <div className="space-y-2.5">
              <p className="font-sans text-xs uppercase tracking-[0.14em] text-inkFaint font-medium">
                How's your energy?
              </p>
              <div className="flex rounded-xl border border-border bg-white/50 p-1 gap-0.5">
                {MOODS.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMood(m.id)}
                    className={`flex-1 min-w-0 rounded-lg py-2.5 px-1 text-center transition font-sans text-sm whitespace-nowrap ${
                      mood === m.id
                        ? "bg-white text-ink shadow-sm font-semibold"
                        : "text-inkMuted hover:text-ink"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
              {MOODS.find((x) => x.id === mood)?.hint && (
                <p className="text-xs text-inkFaint pl-1">{MOODS.find((x) => x.id === mood).hint}</p>
              )}
            </div>

            {/* Theme */}
            <div className="space-y-2.5">
              <p className="font-sans text-xs uppercase tracking-[0.14em] text-inkFaint font-medium">
                Theme
              </p>
              <div className="flex rounded-xl border border-border bg-white/50 p-1 gap-0.5">
                <button
                  type="button"
                  onClick={() => setThemeMode("surprise")}
                  className={`flex-1 rounded-lg py-2.5 px-3 text-center transition font-sans text-sm ${
                    themeMode === "surprise"
                      ? "bg-white text-ink shadow-sm font-semibold"
                      : "text-inkMuted hover:text-ink"
                  }`}
                >
                  Surprise me
                </button>
                <button
                  type="button"
                  onClick={() => setThemeMode("pick")}
                  className={`flex-1 rounded-lg py-2.5 px-3 text-center transition font-sans text-sm ${
                    themeMode === "pick"
                      ? "bg-white text-ink shadow-sm font-semibold"
                      : "text-inkMuted hover:text-ink"
                  }`}
                >
                  Pick a theme
                </button>
              </div>
              {themeMode === "pick" && (
                <select
                  className="input text-sm"
                  value={themePick}
                  onChange={(e) => setThemePick(e.target.value)}
                >
                  {THEMES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              )}
            </div>
          </div>
        ) : (
          /* Direct flow — preview card */
          <div className="flex-1 flex flex-col justify-center">
            <div className="rounded-2xl border border-border bg-white/40 px-5 py-5 space-y-3">
              <div className="flex items-center justify-between">
                <p className="font-sans text-xs uppercase tracking-[0.14em] text-inkFaint font-medium">
                  Today's passage
                </p>
                <span className="font-sans text-xs text-inkMuted bg-white/70 border border-border rounded-full px-2.5 py-0.5">
                  ~{targetReadMinutes} min
                </span>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-inkMuted">
                  <span className="w-1 h-1 rounded-full bg-accent/50 shrink-0" />
                  <p className="font-sans text-sm">Surprise theme, chosen for you</p>
                </div>
                <div className="flex items-center gap-2 text-inkMuted">
                  <span className="w-1 h-1 rounded-full bg-accent/50 shrink-0" />
                  <p className="font-sans text-sm">Written around your goals and profile</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Daily reminder — subtle collapsible row */}
        {showReminderPrompt && (
          reminderExpanded ? (
            <div className="rounded-xl border border-border bg-white/50 px-4 py-3.5 space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-sans text-sm font-medium text-ink">Daily reminder</p>
                  <p className="font-sans text-xs text-inkMuted">Same time, every day.</p>
                </div>
                <input
                  type="time"
                  className="input text-sm w-28 shrink-0 py-2 px-3"
                  value={reminderTime}
                  onChange={(e) => setReminderTime(e.target.value)}
                />
              </div>
              {reminderError && <p className="font-sans text-xs text-accent">{reminderError}</p>}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSetReminder}
                  disabled={reminderStatus === "loading"}
                  className="btn-primary flex-1 py-2.5 text-sm"
                >
                  {reminderStatus === "loading" ? "Setting up…" : "Set reminder"}
                </button>
                <button
                  type="button"
                  onClick={() => setReminderExpanded(false)}
                  className="btn-secondary py-2.5 px-4 text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setReminderExpanded(true)}
              className="flex items-center gap-2 text-left group"
            >
              <span className="text-inkFaint text-base leading-none">🔔</span>
              <span className="font-sans text-sm text-inkFaint group-hover:text-inkMuted transition-colors">
                Set a daily reminder
              </span>
            </button>
          )
        )}

        {reminderStatus === "on" && (
          <p className="font-sans text-xs text-inkMuted">
            Reminder set for {reminderTime} every day ✓
          </p>
        )}

        {/* Error */}
        {error && <p className="text-sm text-accent" role="alert">{error}</p>}

        {/* CTA */}
        <div className="space-y-3">
          <button type="button" className="btn-primary w-full py-4 text-base" onClick={handleGenerate}>
            {checkinFirst ? "Generate today's passage" : "Open today's passage"}
          </button>

          {init.hasPassage && (
            <div className="flex items-center justify-between px-1">
              <button
                type="button"
                onClick={() => navigate("/read")}
                className="font-sans text-sm text-inkMuted hover:text-accent transition-colors"
              >
                Continue today's passage →
              </button>
              <button
                type="button"
                onClick={() => {
                  clearSession();
                  setMood("focused");
                  setThemeMode("surprise");
                  setThemePick(THEMES[0]);
                  setError("");
                }}
                className="font-sans text-sm text-inkFaint hover:text-inkMuted transition-colors"
              >
                Start fresh
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
