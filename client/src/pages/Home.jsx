import { useMemo, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { MOODS, THEMES, PASSAGE_LENGTH_MINUTES } from "../lib/constants.js";
import { generatePassage } from "../lib/api.js";
import { clearSession, loadScores, loadSession, saveSession } from "../lib/storage.js";
import { todayKey } from "../lib/dates.js";
import { requestAndSubscribe } from "../lib/notifications.js";

const DAY_MS = 86_400_000;

// Same UTC-based format as todayKey(), offset by whole days from now
function dayKeyFromToday(offsetDays) {
  return new Date(Date.now() + offsetDays * DAY_MS).toISOString().slice(0, 10);
}

/** "fresh" = no passage for today, "inProgress" = passage not finished, "done" = marked as read. */
function getDayState(session, dk) {
  if (session?.dateKey !== dk || !session?.passage) return "fresh";
  return session.completedToday ? "done" : "inProgress";
}

function readInitialFromSession(session, dk) {
  if (getDayState(session, dk) === "fresh") {
    return { mood: "focused", themeMode: "surprise", themePick: THEMES[0] };
  }
  return {
    mood: session.mood || "focused",
    themeMode: session.themeMode || "surprise",
    themePick: session.themePick && THEMES.includes(session.themePick) ? session.themePick : THEMES[0],
  };
}

/** Yesterday's passage theme + length, from the tab session or the saved score history. */
function getYesterday(session) {
  const yk = dayKeyFromToday(-1);
  if (session?.dateKey === yk && session.passage?.theme) {
    return { theme: session.passage.theme, minutes: session.passage.readTimeMinutes };
  }
  const score = loadScores().find((s) => s.kind !== "pitch" && s.date === yk && s.passageTheme);
  return score ? { theme: score.passageTheme, minutes: score.readTimeMinutes } : null;
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

function WeekStrip({ readDates }) {
  const mondayOffset = -((new Date().getDay() + 6) % 7);
  const read = new Set(readDates);
  const days = ["M", "T", "W", "T", "F", "S", "S"].map((label, i) => {
    const key = dayKeyFromToday(mondayOffset + i);
    return { label, key, isToday: mondayOffset + i === 0, isRead: read.has(key) };
  });
  return (
    <div className="flex items-center gap-3 pt-3" role="list" aria-label="This week">
      {days.map((d) => (
        <div
          key={d.key}
          role="listitem"
          className="flex flex-col items-center gap-1"
          aria-label={`${d.key}${d.isRead ? ", practised" : ""}${d.isToday ? ", today" : ""}`}
        >
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              d.isRead ? "bg-accent" : d.isToday ? "border-[1.5px] border-accent" : "bg-border"
            }`}
          />
          <span className={`font-sans text-[10px] ${d.isToday ? "text-ink font-semibold" : "text-inkFaint"}`}>
            {d.label}
          </span>
        </div>
      ))}
    </div>
  );
}

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
    </svg>
  );
}

function SectionLabel({ children }) {
  return (
    <p className="font-sans text-xs uppercase tracking-[0.14em] text-inkFaint font-medium">{children}</p>
  );
}

export default function Home() {
  const { profile, readDates } = useOutletContext();
  const navigate = useNavigate();
  const dateKey = todayKey();

  const session = useMemo(() => loadSession(), []);
  const init = useMemo(() => readInitialFromSession(session, dateKey), [session, dateKey]);
  const yesterday = useMemo(() => getYesterday(session), [session]);

  const [dayState, setDayState] = useState(() => getDayState(session, dateKey));
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

  const checkinFirst = profile.readingStyle === "checkin";
  const targetReadMinutes = PASSAGE_LENGTH_MINUTES[profile.passageLength] ?? 4;
  const moodLabel = useMemo(() => MOODS.find((m) => m.id === mood)?.label || mood, [mood]);
  const today = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
  const todaysPassage = dayState === "fresh" ? null : session?.passage;

  const handleGenerate = async () => {
    // Only generate when there's no passage for today (Start fresh / Read another reset to "fresh")
    if (dayState !== "fresh") return;
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
        targetRole: profile.targetRole || "",
      });
      saveSession({ dateKey, mood, themeMode, themePick, passage: data, completedToday: false });
      navigate("/read");
    } catch (e) {
      setError(e.message || "Something went wrong.");
      setLoading(false);
    }
  };

  const resetToFresh = () => {
    clearSession();
    setDayState("fresh");
    setMood("focused");
    setThemeMode("surprise");
    setThemePick(THEMES[0]);
    setError("");
  };

  const handleStartFresh = () => {
    if (!window.confirm("Start fresh? Today's passage will be replaced with a new one.")) return;
    resetToFresh();
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

  const speakLike = allInspirations.length > 0 && (
    <div className="space-y-2">
      <SectionLabel>Speak like</SectionLabel>
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
  );

  const subline = {
    fresh: checkinFirst
      ? "A quick check-in, then today's passage."
      : `Ready when you are. ~${targetReadMinutes} min, tailored to you.`,
    inProgress: "Your passage is waiting where you left it.",
    done: "Today's reading is done. Keep the momentum with a rehearsal.",
  }[dayState];

  return (
    <div className="flex flex-col animate-fade-up">
      <div className="flex flex-col surface p-6 sm:p-8 gap-7">

        {/* Greeting */}
        <div className="space-y-1">
          <p className="font-sans text-xs uppercase tracking-[0.2em] text-inkFaint">{today}</p>
          <h1 className="font-serif text-3xl text-ink leading-tight">Hello, {firstName}</h1>
          <p className="font-sans text-sm text-inkMuted leading-relaxed">{subline}</p>
          <WeekStrip readDates={readDates} />
          {yesterday && (
            <p className="font-sans text-xs text-inkFaint pt-1">
              Yesterday: {yesterday.theme}{yesterday.minutes ? ` · ${yesterday.minutes} min` : ""}
            </p>
          )}
        </div>

        <div className="h-px bg-border" />

        {/* Fresh: check-in or preview card */}
        {dayState === "fresh" && (checkinFirst ? (
          <div className="flex-1 flex flex-col gap-5">
            {/* Mood */}
            <div className="space-y-2.5">
              <SectionLabel>How's your energy?</SectionLabel>
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
              <SectionLabel>Theme</SectionLabel>
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

            {speakLike}
          </div>
        ) : (
          /* Direct flow — preview card */
          <div className="rounded-2xl border border-border bg-white/40 px-5 py-5 space-y-4">
            <div className="flex items-center justify-between">
              <SectionLabel>Today's passage</SectionLabel>
              <span className="font-sans text-xs text-inkMuted bg-white/70 border border-border rounded-full px-2.5 py-0.5">
                ~{targetReadMinutes} min
              </span>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-start gap-2 text-inkMuted">
                <span className="w-1 h-1 mt-2 rounded-full bg-accent/50 shrink-0" />
                <p className="font-sans text-sm">Surprise theme, chosen for you</p>
              </div>
              <div className="flex items-start gap-2 text-inkMuted">
                <span className="w-1 h-1 mt-2 rounded-full bg-accent/50 shrink-0" />
                <p className="font-sans text-sm">Written around your goals and profile</p>
              </div>
            </div>
            {speakLike && <div className="border-t border-border pt-4">{speakLike}</div>}
          </div>
        ))}

        {/* In progress: today's passage */}
        {dayState === "inProgress" && todaysPassage && (
          <div className="rounded-2xl border border-border bg-white/40 px-5 py-5 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <p className="font-sans text-xs uppercase tracking-[0.14em] text-accent font-medium truncate">
                {todaysPassage.theme}
              </p>
              <span className="shrink-0 font-sans text-xs text-inkMuted bg-white/70 border border-border rounded-full px-2.5 py-0.5">
                ~{todaysPassage.readTimeMinutes} min
              </span>
            </div>
            <p className="font-serif text-xl text-ink leading-snug">{todaysPassage.title}</p>
          </div>
        )}

        {/* Done: read note (Rehearse becomes the primary CTA below) */}
        {dayState === "done" && (
          <div className="rounded-2xl border border-accent/30 bg-accentSoft/40 px-5 py-4">
            <p className="font-sans text-sm font-semibold text-ink">You&apos;ve read today ✓</p>
            {todaysPassage?.title && (
              <p className="font-sans text-xs text-inkMuted mt-0.5">{todaysPassage.title}</p>
            )}
          </div>
        )}

        {/* Error */}
        {error && <p className="text-sm text-accent" role="alert">{error}</p>}

        {/* CTA */}
        <div className="space-y-3">
          {dayState === "fresh" && (
            <button type="button" className="btn-primary w-full py-4 text-base" onClick={handleGenerate}>
              {checkinFirst ? "Generate today's passage" : "Open today's passage"}
            </button>
          )}

          {dayState === "inProgress" && (
            <button type="button" className="btn-primary w-full py-4 text-base" onClick={() => navigate("/read")}>
              Continue reading
            </button>
          )}

          <button
            type="button"
            className={`${dayState === "done" ? "btn-primary" : "btn-secondary"} w-full py-4 text-base`}
            onClick={() => navigate("/pitch")}
          >
            Rehearse a conversation
          </button>
          <p className="font-sans text-xs text-inkFaint text-center">
            Role-play a real moment from work and get coached.
          </p>

          {dayState === "inProgress" && (
            <div className="flex justify-center px-1">
              <button
                type="button"
                onClick={handleStartFresh}
                className="font-sans text-sm text-inkFaint hover:text-inkMuted transition-colors"
              >
                Start fresh
              </button>
            </div>
          )}

          {dayState === "done" && (
            <div className="flex justify-center px-1">
              <button
                type="button"
                onClick={resetToFresh}
                className="font-sans text-sm text-inkFaint hover:text-inkMuted transition-colors"
              >
                Read another
              </button>
            </div>
          )}
        </div>

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
              className="flex items-center gap-2 text-left text-inkFaint hover:text-inkMuted transition-colors"
            >
              <BellIcon />
              <span className="font-sans text-sm">Set a daily reminder</span>
            </button>
          )
        )}

        {reminderStatus === "on" && (
          <p className="font-sans text-xs text-inkMuted">
            Reminder set for {reminderTime} every day ✓
          </p>
        )}

      </div>
    </div>
  );
}
