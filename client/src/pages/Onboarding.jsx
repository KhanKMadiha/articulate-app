import { useState } from "react";
import { FOCUS_AREA_OPTIONS } from "../lib/constants.js";
import { saveProfile } from "../lib/storage.js";
import { requestAndSubscribe } from "../lib/notifications.js";
import SpeakerInput from "../components/SpeakerInput.jsx";

const TOTAL = 7;

// Speakers mapped to each focus area — shown contextually on step 4
const SPEAKERS_BY_FOCUS = {
  "Executive communication":       ["Satya Nadella", "Sheryl Sandberg", "Indra Nooyi", "Oprah Winfrey", "Barack Obama", "Tim Cook", "Mary Barra"],
  "AI & tech fluency":             ["Sam Altman", "Jensen Huang", "Mira Murati", "Daniela Amodei", "Fei-Fei Li", "Sundar Pichai", "Mustafa Suleyman"],
  "Confidence & presence":         ["Codie Sanchez", "Bahja Abdi", "Emma Grede", "Brené Brown", "Michelle Obama", "Amy Cuddy", "Tony Robbins"],
  "Managing upwards":              ["Sheryl Sandberg", "Adam Grant", "Simon Sinek", "Patty McCord", "Kim Scott", "Anne Morriss", "Liz Wiseman"],
  "Storytelling with data":        ["Malcolm Gladwell", "Hans Rosling", "Brené Brown", "Scott Galloway", "Nneka Ogwumike", "Steven Levitt", "Dan Roam"],
  "Technical leadership":          ["Jensen Huang", "Satya Nadella", "Sam Altman", "Anjali Sud", "Kelsey Hightower", "Will Larson", "Charity Majors"],
  "Strategic thinking":            ["Barack Obama", "Reed Hastings", "Jamie Dimon", "Oprah Winfrey", "Ray Dalio", "Roger Martin", "A.G. Lafley"],
  "Influencing without authority": ["Simon Sinek", "Adam Grant", "Gary Vaynerchuk", "Michelle Obama", "Codie Sanchez", "Robert Cialdini", "Jonah Berger"],
};

const FALLBACK_SPEAKERS = [
  "Codie Sanchez", "Bahja Abdi", "Simon Sinek", "Brené Brown",
  "Barack Obama", "Malcolm Gladwell", "Oprah Winfrey", "Michelle Obama", "Trevor Noah",
];

function getSuggestedSpeakers(focusAreas) {
  const seen = new Set();
  const result = [];
  for (const area of focusAreas) {
    for (const speaker of SPEAKERS_BY_FOCUS[area] || []) {
      if (!seen.has(speaker)) { seen.add(speaker); result.push(speaker); }
    }
  }
  for (const s of FALLBACK_SPEAKERS) {
    if (result.length >= 9) break;
    if (!seen.has(s)) { seen.add(s); result.push(s); }
  }
  return result.slice(0, 9);
}

export default function Onboarding({ onComplete }) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [industry, setIndustry] = useState("");
  const [careerGoal, setCareerGoal] = useState("");
  const [focusAreas, setFocusAreas] = useState([]);
  const [speakingInspirations, setSpeakingInspirations] = useState([]);
  const [readingStyle, setReadingStyle] = useState(null);
  const [passageLength, setPassageLength] = useState("medium");
  const [dyslexiaMode, setDyslexiaMode] = useState(false);
  const [reminderTime, setReminderTime] = useState("08:00");
  const [reminderStatus, setReminderStatus] = useState("idle");
  const [reminderError, setReminderError] = useState("");
  const [error, setError] = useState("");

  const goBack = () => { setError(""); setStep((s) => Math.max(1, s - 1)); };

  const toggleFocus = (label) => {
    setFocusAreas((prev) => {
      if (prev.includes(label)) return prev.filter((x) => x !== label);
      if (prev.length >= 3) return prev;
      return [...prev, label];
    });
  };

  const advanceFrom1 = () => {
    if (!name.trim()) { setError("Add your first name so we can greet you properly."); return; }
    setError(""); setStep(2);
  };
  const advanceFrom2 = () => {
    if (!jobTitle.trim() || !industry.trim() || !careerGoal.trim()) {
      setError("A few more details. We use all of this to shape your passages."); return;
    }
    setError(""); setStep(3);
  };
  const advanceFrom3 = () => {
    if (focusAreas.length < 1) { setError("Choose at least one focus area. You can pick up to three."); return; }
    setError(""); setStep(4);
  };

  const toggleSpeaker = (name) => {
    setSpeakingInspirations((prev) =>
      prev.includes(name) ? prev.filter((s) => s !== name) : prev.length < 3 ? [...prev, name] : prev
    );
  };

  const advanceFrom4 = () => { setError(""); setStep(5); };

  const advanceFrom5 = () => {
    if (!readingStyle) { setError("Pick how you'd like to start each day."); return; }
    setError(""); setStep(6);
  };

  const advanceFrom6 = () => { setError(""); setStep(7); };

  const handleSetReminder = async () => {
    setReminderStatus("loading");
    setReminderError("");
    try {
      await requestAndSubscribe(reminderTime);
      setReminderStatus("on");
    } catch (e) {
      setReminderError(e.message);
      setReminderStatus("idle");
    }
  };

  const finish = () => {
    saveProfile({
      name: name.trim(), jobTitle: jobTitle.trim(), industry: industry.trim(),
      careerGoal: careerGoal.trim(), focusAreas: focusAreas.slice(0, 3),
      speakingInspirations, readingStyle, passageLength, dyslexiaMode,
    });
    onComplete?.();
  };

  return (
    <div className="min-h-screen bg-paper flex flex-col">
      <div className="max-w-lg w-full mx-auto px-5 pt-8 pb-8 flex-1 flex flex-col">

        {/* Progress header */}
        <header className="mb-8">
          <div className="flex items-center justify-between gap-4 mb-6">
            {step > 1 ? (
              <button type="button" onClick={goBack} className="font-sans text-sm text-inkMuted hover:text-ink py-2 -ml-1 pr-4">
                ← Back
              </button>
            ) : (
              <span className="w-16" aria-hidden />
            )}
            <p className="font-sans text-xs text-inkMuted tabular-nums tracking-wide">{step} / {TOTAL}</p>
          </div>
          <div className="flex gap-2 justify-center" aria-hidden>
            {Array.from({ length: TOTAL }, (_, i) => (
              <span key={i} className={`h-1.5 flex-1 max-w-[4.5rem] rounded-full transition-colors ${i < step ? "bg-accent" : "bg-border"}`} />
            ))}
          </div>
        </header>

        {/* Step 1 — Name */}
        {step === 1 && (
          <section className="flex-1 flex flex-col">
            <div className="space-y-3 mb-8">
              <h1 className="font-serif text-[2rem] sm:text-4xl text-ink leading-[1.15]">Let&apos;s build your voice.</h1>
              <p className="font-sans text-inkMuted text-base leading-relaxed">
                A few quick questions so your daily passages feel written just for you.
              </p>
            </div>
            <input
              className="onboarding-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="First name"
              autoComplete="given-name"
              autoFocus
            />
            <div className="min-h-[2rem]" />
            <div className="sticky bottom-0 bg-paper pt-2 pb-8">
              {error ? <p className="text-sm text-accent mb-3" role="alert">{error}</p> : null}
              <button type="button" className="onboarding-cta" onClick={advanceFrom1}>Let&apos;s go →</button>
            </div>
          </section>
        )}

        {/* Step 2 — Role */}
        {step === 2 && (
          <section className="flex-1 flex flex-col">
            <h1 className="font-serif text-[2rem] sm:text-4xl text-ink leading-[1.15] mb-8">What do you do?</h1>
            <div className="space-y-6">
              <label className="block">
                <span className="onboarding-label">Job title</span>
                <input className="onboarding-input" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder='e.g. "Senior Support Engineer"' autoComplete="organization-title" />
              </label>
              <label className="block">
                <span className="onboarding-label">Industry</span>
                <input className="onboarding-input" value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder='e.g. "SaaS / Developer Tools"' />
              </label>
              <label className="block">
                <span className="onboarding-label">Where do you want to be in 2–3 years?</span>
                <textarea className="onboarding-input min-h-[120px] resize-y leading-relaxed" value={careerGoal} onChange={(e) => setCareerGoal(e.target.value)} placeholder='e.g. "Moving into a technical leadership or management role"' />
              </label>
            </div>
            <div className="min-h-[2rem]" />
            <div className="sticky bottom-0 bg-paper pt-2 pb-8">
              {error ? <p className="text-sm text-accent mb-3" role="alert">{error}</p> : null}
              <button type="button" className="onboarding-cta" onClick={advanceFrom2}>Next →</button>
            </div>
          </section>
        )}

        {/* Step 3 — Focus areas */}
        {step === 3 && (
          <section className="flex-1 flex flex-col">
            <div className="space-y-2 mb-8">
              <h1 className="font-serif text-[2rem] sm:text-4xl text-ink leading-[1.15]">What do you want to get better at?</h1>
              <p className="font-sans text-inkMuted text-base leading-relaxed">Pick up to 3. These shape every passage you receive.</p>
            </div>
            <div className="flex flex-wrap gap-2.5">
              {FOCUS_AREA_OPTIONS.map((label) => {
                const active = focusAreas.includes(label);
                const disabled = !active && focusAreas.length >= 3;
                return (
                  <button key={label} type="button" disabled={disabled} data-active={active} onClick={() => toggleFocus(label)} className="onboarding-chip">
                    {label}
                  </button>
                );
              })}
            </div>
            <div className="min-h-[2rem]" />
            <p className="font-sans text-sm text-inkMuted mb-4">{focusAreas.length} of 3 selected</p>
            <div className="sticky bottom-0 bg-paper pt-2 pb-8">
              {error ? <p className="text-sm text-accent mb-3" role="alert">{error}</p> : null}
              <button type="button" className="onboarding-cta" onClick={advanceFrom3}>Almost there →</button>
            </div>
          </section>
        )}

        {/* Step 4 — Inspirations */}
        {step === 4 && (
          <section className="flex-1 flex flex-col">
            <div className="space-y-1.5 mb-8">
              <h1 className="font-serif text-[2rem] sm:text-4xl text-ink leading-[1.15]">Who do you want to sound like?</h1>
              <p className="font-sans text-inkMuted text-base leading-relaxed">
                Based on your goals, here are some voices worth channelling. Pick up to 3 and we'll write your passages in their spirit.
              </p>
              <p className="font-sans text-xs text-inkFaint">Optional. Tap Skip if you're not sure yet.</p>
            </div>
            <div className="flex flex-wrap gap-2.5 mb-6">
              {getSuggestedSpeakers(focusAreas).map((speaker) => {
                const active = speakingInspirations.includes(speaker);
                const disabled = !active && speakingInspirations.length >= 3;
                return (
                  <button key={speaker} type="button" disabled={disabled} data-active={active} onClick={() => toggleSpeaker(speaker)} className="onboarding-chip">
                    {speaker}
                  </button>
                );
              })}
              {speakingInspirations.filter((s) => !getSuggestedSpeakers(focusAreas).includes(s)).map((speaker) => (
                <button
                  key={speaker}
                  type="button"
                  data-active="true"
                  className="onboarding-chip inline-flex items-center gap-1.5"
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
            <div className="min-h-[2rem]" />
            <div className="sticky bottom-0 bg-paper pt-2 pb-8">
              {speakingInspirations.length > 0 && (
                <p className="font-sans text-sm text-inkMuted mb-3">Selected: {speakingInspirations.join(", ")}</p>
              )}
              <button type="button" className="onboarding-cta" onClick={advanceFrom4}>
                {speakingInspirations.length > 0 ? "Next →" : "Skip →"}
              </button>
            </div>
          </section>
        )}

        {/* Step 5 — Reading style + length */}
        {step === 5 && (
          <section className="flex-1 flex flex-col">
            <h1 className="font-serif text-[2rem] sm:text-4xl text-ink leading-[1.15] mb-8">How do you like to read?</h1>
            <div className="space-y-4 mb-8">
              <button type="button" onClick={() => setReadingStyle("direct")} aria-pressed={readingStyle === "direct"} className={`onboarding-card ${readingStyle === "direct" ? "onboarding-card--on" : ""}`}>
                <span className="text-2xl mb-2 block" aria-hidden>🎯</span>
                <span className="font-serif text-xl text-ink block mb-1">Get straight to it</span>
                <span className="font-sans text-sm text-inkMuted leading-relaxed">Open the app, passage appears, I read.</span>
              </button>
              <button type="button" onClick={() => setReadingStyle("checkin")} aria-pressed={readingStyle === "checkin"} className={`onboarding-card ${readingStyle === "checkin" ? "onboarding-card--on" : ""}`}>
                <span className="text-2xl mb-2 block" aria-hidden>☀️</span>
                <span className="font-serif text-xl text-ink block mb-1">Quick check-in first</span>
                <span className="font-sans text-sm text-inkMuted leading-relaxed">I&apos;ll tell you my energy and pick a theme before generating.</span>
              </button>
            </div>
            <div>
              <p className="onboarding-label mb-3">How long should each passage be?</p>
              <div className="flex rounded-2xl border border-border bg-white/50 p-1 gap-1" role="group" aria-label="Passage length">
                {[{ id: "short", label: "Short", sub: "2 min" }, { id: "medium", label: "Medium", sub: "4 min" }, { id: "long", label: "Long", sub: "6 min" }].map(({ id, label, sub }) => (
                  <button key={id} type="button" onClick={() => setPassageLength(id)}
                    className={`flex-1 rounded-xl py-3 px-2 text-center transition font-sans ${passageLength === id ? "bg-white text-ink shadow-sm" : "text-inkMuted hover:text-ink"}`}>
                    <span className="block text-sm font-semibold text-ink">{label}</span>
                    <span className="block text-xs mt-0.5 opacity-80">{sub}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="min-h-[2rem]" />
            <div className="sticky bottom-0 bg-paper pt-2 pb-8">
              {error ? <p className="text-sm text-accent mb-3" role="alert">{error}</p> : null}
              <button type="button" className="onboarding-cta" onClick={advanceFrom5}>Next →</button>
            </div>
          </section>
        )}

        {/* Step 6 — Dyslexia mode */}
        {step === 6 && (
          <section className="flex-1 flex flex-col">
            <div className="space-y-2 mb-8">
              <h1 className="font-serif text-[2rem] sm:text-4xl text-ink leading-[1.15]">How do you like to read text?</h1>
              <p className="font-sans text-inkMuted text-base leading-relaxed">
                If you find dense text harder to read, the dyslexia-friendly mode uses a wider-spaced font and more breathing room. You can change this any time in Settings.
              </p>
            </div>
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => setDyslexiaMode(false)}
                aria-pressed={!dyslexiaMode}
                className={`onboarding-card ${!dyslexiaMode ? "onboarding-card--on" : ""}`}
              >
                <span className="text-2xl mb-2 block" aria-hidden>Aa</span>
                <span className="font-serif text-xl text-ink block mb-1">Standard</span>
                <span className="font-sans text-sm text-inkMuted leading-relaxed">Lora serif for passages, DM Sans for the interface.</span>
              </button>
              <button
                type="button"
                onClick={() => setDyslexiaMode(true)}
                aria-pressed={dyslexiaMode}
                className={`onboarding-card ${dyslexiaMode ? "onboarding-card--on" : ""}`}
              >
                <span className="text-2xl mb-2 block" aria-hidden style={{ fontFamily: "Lexend, sans-serif" }}>Aa</span>
                <span className="font-serif text-xl text-ink block mb-1">Dyslexia-friendly</span>
                <span className="font-sans text-sm text-inkMuted leading-relaxed">Lexend font throughout — wider spacing, more room between lines, and shorter sentences in passages.</span>
              </button>
            </div>
            <div className="sticky bottom-0 bg-paper pt-2 pb-8">
              <button type="button" className="onboarding-cta" onClick={advanceFrom6}>Next →</button>
            </div>
          </section>
        )}

        {/* Step 7 — Reminder */}
        {step === 7 && (
          <section className="flex-1 flex flex-col">
            <div className="space-y-2 mb-8">
              <h1 className="font-serif text-[2rem] sm:text-4xl text-ink leading-[1.15]">Set a daily reminder?</h1>
              <p className="font-sans text-inkMuted text-base leading-relaxed">
                Get a push notification at the same time every day so the habit sticks. You can always change this in Settings.
              </p>
            </div>
            <div className="space-y-6">
              {reminderStatus !== "on" ? (
                <>
                  <div className="rounded-2xl border border-border bg-white/70 px-5 py-4 shadow-sm">
                    <p className="onboarding-label mb-3">What time works for you?</p>
                    <div className="flex items-center gap-3">
                      <input type="time" className="input text-base py-3 px-4 w-36 shrink-0" value={reminderTime} onChange={(e) => setReminderTime(e.target.value)} />
                      <p className="font-sans text-sm text-inkMuted leading-relaxed">We'll send a nudge at this time every day.</p>
                    </div>
                  </div>
                  {reminderError && <p className="font-sans text-sm text-accent">{reminderError}</p>}
                  <button type="button" className="onboarding-cta w-full" disabled={reminderStatus === "loading"} onClick={handleSetReminder}>
                    {reminderStatus === "loading" ? "Setting up…" : "Set reminder"}
                  </button>
                </>
              ) : (
                <div className="rounded-2xl border border-accent/30 bg-accentSoft/40 px-5 py-4">
                  <p className="font-sans text-sm font-semibold text-ink">Reminder set for {reminderTime} every day ✓</p>
                </div>
              )}
              <p className="font-sans text-xs text-inkFaint">Requires the app to be added to your home screen. iOS 16.4+ only.</p>
            </div>
            <div className="sticky bottom-0 bg-paper pt-2 pb-8">
              <button type="button" className="onboarding-cta" onClick={finish}>
                {reminderStatus === "on" ? "Start reading →" : "Skip for now →"}
              </button>
            </div>
          </section>
        )}

      </div>
    </div>
  );
}
