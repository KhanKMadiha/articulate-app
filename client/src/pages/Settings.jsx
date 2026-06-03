import { useState } from "react";
import { FOCUS_AREA_OPTIONS } from "../lib/constants.js";
import { loadProfile, saveProfile } from "../lib/storage.js";
import { requestAndSubscribe, unsubscribe } from "../lib/notifications.js";
import SpeakerInput from "../components/SpeakerInput.jsx";

const SUGGESTED_SPEAKERS = [
  "Codie Sanchez", "Bahja Abdi", "Mira Murati", "Daniela Amodei",
  "Emma Grede", "Brené Brown", "Barack Obama", "Michelle Obama",
  "Oprah Winfrey", "Simon Sinek",
];

function SegmentedControl({ options, value, onChange, className = "" }) {
  return (
    <div className={`flex rounded-lg border border-border bg-white/50 p-0.5 gap-0.5 shrink-0 ${className}`}>
      {options.map(({ id, label, sub }) => (
        <button
          key={String(id)}
          type="button"
          onClick={() => onChange(id)}
          className={`rounded-md px-3 py-1.5 font-sans text-xs transition-all text-center ${
            value === id ? "bg-white text-ink shadow-sm font-semibold" : "text-inkMuted hover:text-ink"
          }`}
        >
          {sub ? (
            <>
              <span className="block">{label}</span>
              <span className="block text-[9px] opacity-70 mt-px">{sub}</span>
            </>
          ) : label}
        </button>
      ))}
    </div>
  );
}

function SettingRow({ label, description, children }) {
  return (
    <div className="px-5 py-4 flex items-center justify-between gap-4">
      <div className="min-w-0 flex-1">
        <p className="font-sans text-sm font-medium text-ink leading-none">{label}</p>
        {description && <p className="font-sans text-xs text-inkMuted mt-1 leading-relaxed">{description}</p>}
      </div>
      {children}
    </div>
  );
}

function SectionHeader({ title }) {
  return (
    <div className="px-5 py-3 border-b border-border">
      <p className="font-sans text-[10px] uppercase tracking-[0.2em] text-inkFaint font-semibold">{title}</p>
    </div>
  );
}

export default function Settings({ onSaved }) {
  const initial = loadProfile();
  const [name, setName] = useState(initial?.name || "");
  const [jobTitle, setJobTitle] = useState(initial?.jobTitle || "");
  const [industry, setIndustry] = useState(initial?.industry || "");
  const [careerGoal, setCareerGoal] = useState(initial?.careerGoal || "");
  const [focusAreas, setFocusAreas] = useState(initial?.focusAreas || []);
  const [readingStyle, setReadingStyle] = useState(initial?.readingStyle || "checkin");
  const [passageLength, setPassageLength] = useState(initial?.passageLength || "medium");
  const [speakingInspirations, setSpeakingInspirations] = useState(initial?.speakingInspirations || []);
  const [dyslexiaMode, setDyslexiaMode] = useState(initial?.dyslexiaMode ?? false);
  const [dyslexiaFont, setDyslexiaFont] = useState(initial?.dyslexiaFont ?? "lexend");
  const [fontSize, setFontSize] = useState(initial?.fontSize ?? "normal");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [reminderTime, setReminderTime] = useState("08:00");
  const [reminderStatus, setReminderStatus] = useState("idle");
  const [reminderError, setReminderError] = useState("");

  const toggleFocus = (label) => {
    setFocusAreas((prev) => {
      if (prev.includes(label)) return prev.filter((x) => x !== label);
      if (prev.length >= 3) return prev;
      return [...prev, label];
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim() || !jobTitle.trim() || !industry.trim() || !careerGoal.trim()) {
      setError("Please fill in every field.");
      setMessage("");
      return;
    }
    if (focusAreas.length < 1) {
      setError("Choose at least one focus area.");
      setMessage("");
      return;
    }
    setError("");
    saveProfile({
      name: name.trim(), jobTitle: jobTitle.trim(), industry: industry.trim(),
      careerGoal: careerGoal.trim(), focusAreas: focusAreas.slice(0, 3),
      speakingInspirations, readingStyle, passageLength,
      dyslexiaMode, dyslexiaFont, fontSize,
    });
    onSaved?.();
    setMessage("Saved.");
    window.setTimeout(() => setMessage(""), 2500);
  };

  return (
    <div className="space-y-5 max-w-lg">
      <div>
        <p className="font-sans text-xs uppercase tracking-[0.2em] text-inkMuted mb-1">Account</p>
        <h1 className="font-serif text-3xl text-ink">Settings</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">

        {/* ── Profile ── */}
        <section className="surface overflow-hidden divide-y divide-border">
          <SectionHeader title="Profile" />
          <div className="px-5 py-4 space-y-4">
            <label className="flex flex-col gap-1.5">
              <span className="font-sans text-xs text-inkMuted">Name</span>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="font-sans text-xs text-inkMuted">Job title</span>
              <input className="input" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="font-sans text-xs text-inkMuted">Industry</span>
              <input className="input" value={industry} onChange={(e) => setIndustry(e.target.value)} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="font-sans text-xs text-inkMuted">2–3 year direction</span>
              <textarea
                className="input min-h-[90px] resize-y"
                value={careerGoal}
                onChange={(e) => setCareerGoal(e.target.value)}
              />
            </label>
          </div>
        </section>

        {/* ── Focus areas ── */}
        <section className="surface overflow-hidden">
          <SectionHeader title="Focus areas" />
          <div className="px-5 pt-3 pb-1">
            <p className="font-sans text-xs text-inkMuted">Up to 3 — these shape every passage.</p>
          </div>
          <div className="px-5 pb-4 pt-2 flex flex-wrap gap-2">
            {FOCUS_AREA_OPTIONS.map((label) => {
              const active = focusAreas.includes(label);
              const disabled = !active && focusAreas.length >= 3;
              return (
                <button key={label} type="button" disabled={disabled} data-active={active} className="chip" onClick={() => toggleFocus(label)}>
                  {label}
                </button>
              );
            })}
          </div>
        </section>

        {/* ── Speaking inspirations ── */}
        <section className="surface overflow-hidden">
          <SectionHeader title="Speaking inspirations" />
          <div className="px-5 pt-3 pb-1">
            <p className="font-sans text-xs text-inkMuted">Up to 3 — passages are written in their spirit.</p>
          </div>
          <div className="px-5 pt-2 pb-4 flex flex-wrap gap-2 items-center">
            {SUGGESTED_SPEAKERS.map((speaker) => {
              const active = speakingInspirations.includes(speaker);
              const disabled = !active && speakingInspirations.length >= 3;
              return (
                <button
                  key={speaker}
                  type="button"
                  disabled={disabled}
                  data-active={active}
                  className="chip"
                  onClick={() =>
                    setSpeakingInspirations((prev) =>
                      prev.includes(speaker) ? prev.filter((s) => s !== speaker)
                        : prev.length < 3 ? [...prev, speaker] : prev
                    )
                  }
                >
                  {speaker}
                </button>
              );
            })}
            {speakingInspirations.filter((s) => !SUGGESTED_SPEAKERS.includes(s)).map((speaker) => (
              <button
                key={speaker}
                type="button"
                data-active="true"
                className="chip inline-flex items-center gap-1.5"
                onClick={() => setSpeakingInspirations((prev) => prev.filter((s) => s !== speaker))}
              >
                {speaker}
                <span className="text-inkFaint text-xs" aria-hidden>×</span>
              </button>
            ))}
            <SpeakerInput
              selected={speakingInspirations}
              onAdd={(name) => setSpeakingInspirations((p) => p.length < 3 ? [...p, name] : p)}
            />
          </div>
        </section>

        {/* ── Passages ── */}
        <section className="surface overflow-hidden divide-y divide-border">
          <SectionHeader title="Passages" />
          <SettingRow label="Daily flow" description={readingStyle === "direct" ? "Passage loads straight away" : "Quick energy and theme check-in first"}>
            <SegmentedControl
              value={readingStyle}
              onChange={setReadingStyle}
              options={[{ id: "direct", label: "Direct" }, { id: "checkin", label: "Check-in" }]}
            />
          </SettingRow>
          <SettingRow label="Length" description="Target read-aloud time">
            <SegmentedControl
              value={passageLength}
              onChange={setPassageLength}
              options={[
                { id: "short", label: "Short", sub: "2 min" },
                { id: "medium", label: "Medium", sub: "4 min" },
                { id: "long", label: "Long", sub: "6 min" },
              ]}
            />
          </SettingRow>
        </section>

        {/* ── Reading ── */}
        <section className="surface overflow-hidden divide-y divide-border">
          <SectionHeader title="Reading" />
          <SettingRow
            label="Mode"
            description={dyslexiaMode ? "Wider spacing, shorter sentences, reading aids" : "Lora serif, standard layout"}
          >
            <SegmentedControl
              value={dyslexiaMode}
              onChange={setDyslexiaMode}
              options={[{ id: false, label: "Standard" }, { id: true, label: "Dyslexia" }]}
            />
          </SettingRow>
          {dyslexiaMode && (
            <SettingRow label="Font">
              <SegmentedControl
                value={dyslexiaFont}
                onChange={setDyslexiaFont}
                options={[{ id: "lexend", label: "Lexend" }, { id: "opendyslexic", label: "OpenDyslexic" }]}
              />
            </SettingRow>
          )}
          <SettingRow label="Text size">
            <div className="flex rounded-lg border border-border bg-white/50 p-0.5 gap-0.5 shrink-0">
              {[
                { id: "normal", size: "text-xs" },
                { id: "large", size: "text-sm" },
                { id: "xlarge", size: "text-base" },
              ].map(({ id, size }) => (
                <button
                  key={id}
                  type="button"
                  title={id === "normal" ? "Normal" : id === "large" ? "Large" : "Extra large"}
                  onClick={() => setFontSize(id)}
                  className={`rounded-md w-9 h-8 flex items-center justify-center font-sans font-semibold transition-all ${size} ${
                    fontSize === id ? "bg-white text-ink shadow-sm" : "text-inkMuted hover:text-ink"
                  }`}
                >
                  A
                </button>
              ))}
            </div>
          </SettingRow>
        </section>

        {error && <p className="font-sans text-sm text-accent px-1" role="alert">{error}</p>}
        {message && <p className="font-sans text-sm text-inkMuted px-1" role="status">{message}</p>}

        <button type="submit" className="btn-primary w-full">Save changes</button>
      </form>

      {/* ── Reminder ── */}
      <section className="surface overflow-hidden divide-y divide-border">
        <SectionHeader title="Daily reminder" />
        <div className="px-5 py-4 space-y-3">
          <p className="font-sans text-xs text-inkMuted leading-relaxed">
            Push notification at the same time every day. Requires the app to be added to your home screen (iOS 16.4+).
          </p>
          {reminderStatus !== "on" ? (
            <div className="flex items-center gap-3">
              <input
                type="time"
                className="input flex-1 py-2.5 text-sm"
                value={reminderTime}
                onChange={(e) => setReminderTime(e.target.value)}
              />
              <button
                type="button"
                className="btn-primary shrink-0 py-2.5 text-sm"
                disabled={reminderStatus === "loading"}
                onClick={async () => {
                  setReminderStatus("loading");
                  setReminderError("");
                  try {
                    await requestAndSubscribe(reminderTime);
                    setReminderStatus("on");
                  } catch (e) {
                    setReminderError(e.message);
                    setReminderStatus("error");
                  }
                }}
              >
                {reminderStatus === "loading" ? "Setting up…" : "Set reminder"}
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <p className="font-sans text-sm text-ink">
                Set for <span className="font-semibold">{reminderTime}</span> every day
              </p>
              <button
                type="button"
                className="font-sans text-sm text-inkMuted hover:text-accent transition-colors"
                onClick={async () => { await unsubscribe(); setReminderStatus("idle"); }}
              >
                Turn off
              </button>
            </div>
          )}
          {reminderError && <p className="font-sans text-xs text-accent">{reminderError}</p>}
        </div>
      </section>
    </div>
  );
}
