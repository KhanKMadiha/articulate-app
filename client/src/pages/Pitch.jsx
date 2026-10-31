import { useEffect, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { PITCH_DIMENSIONS, PITCH_GOALS, SELLING_GOAL_IDS } from "../lib/constants.js";
import { generatePitch, scorePitch } from "../lib/api.js";
import {
  addPitchDate,
  loadPitchAudiences,
  loadPitchGoal,
  saveScore,
  savePitchAudiences,
  savePitchGoal,
} from "../lib/storage.js";
import { todayKey } from "../lib/dates.js";
import { useRecorder } from "../hooks/useRecorder.js";
import ScoreCard from "../components/ScoreCard.jsx";

const CUSTOM_GOAL_MAX = 60;

/** Saved goal → profile.targetRole match → support-ish job title → sales. */
function initialGoal(profile) {
  const saved = loadPitchGoal();
  if (saved && PITCH_GOALS.some((g) => g.id === saved.id)) return saved;
  const target = (profile.targetRole || "").trim();
  const byTarget = target && PITCH_GOALS.find(
    (g) => g.label.toLowerCase() === target.toLowerCase() || g.match?.test(target)
  );
  if (byTarget) return { id: byTarget.id, custom: "" };
  if (/support|escalation|success/i.test(profile.jobTitle || "")) return { id: "support", custom: "" };
  return { id: "sales", custom: "" };
}

function findGoal(id) {
  return PITCH_GOALS.find((g) => g.id === id) ?? PITCH_GOALS[0];
}

function rememberedAudience(goal, memory) {
  const id = memory[goal.id];
  return goal.audiences.some((a) => a.id === id) ? id : goal.audiences[0].id;
}

// "Customer" → "your customer", "Your manager" → "your manager", "C-suite exec" → "your C-suite exec"
function toYour(label) {
  const lowered = /^[A-Z][a-z]/.test(label) ? label[0].toLowerCase() + label.slice(1) : label;
  return /^your /i.test(lowered) ? lowered : `your ${lowered}`;
}

function FullScreenStatus({ title, sub }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-paper gap-6 px-8 text-center">
      <div className="flex justify-center gap-1.5 mb-2">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="inline-block w-2.5 h-2.5 rounded-full bg-accent"
            style={{ animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }}
          />
        ))}
      </div>
      <p className="font-serif text-2xl text-ink">{title}</p>
      <p className="font-sans text-sm text-inkMuted">{sub}</p>
    </div>
  );
}

function Label({ children }) {
  return (
    <p className="font-sans text-xs uppercase tracking-[0.14em] text-inkFaint font-medium">{children}</p>
  );
}

function BackLink({ onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="self-start font-sans text-sm text-inkMuted hover:text-accent transition-colors"
    >
      ← {children}
    </button>
  );
}

function formatSeconds(s) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export default function Pitch() {
  const { profile } = useOutletContext();
  const navigate = useNavigate();

  const [start] = useState(() => {
    const goal = initialGoal(profile);
    const memory = loadPitchAudiences();
    const g = findGoal(goal.id);
    return { goal, memory, audienceId: rememberedAudience(g, memory), scenarioId: g.scenarios[0].id };
  });

  const [goalId, setGoalId] = useState(start.goal.id);
  const [customGoal, setCustomGoal] = useState(start.goal.custom);
  const [audienceMemory, setAudienceMemory] = useState(start.memory);
  const [audienceId, setAudienceId] = useState(start.audienceId);
  const [scenarioId, setScenarioId] = useState(start.scenarioId);
  const [context, setContext] = useState("");
  const [scenario, setScenario] = useState(null);
  const [loading, setLoading] = useState(false);
  const [scoring, setScoring] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const recorder = useRecorder();

  const goal = findGoal(goalId);
  const audience = goal.audiences.find((a) => a.id === audienceId) ?? goal.audiences[0];
  const scenarioDef = goal.scenarios.find((s) => s.id === scenarioId) ?? goal.scenarios[0];
  const goalLabel = goal.id === "other" ? customGoal.trim() : goal.label;
  const selling = SELLING_GOAL_IDS.includes(goal.id);
  const pitchContext = { goalLabel, roleLabel: goal.role, audienceLabel: audience.label, audienceStyle: audience.style };

  const selectAudience = (id) => {
    setAudienceId(id);
    const next = { ...audienceMemory, [goalId]: id };
    setAudienceMemory(next);
    savePitchAudiences(next);
  };

  const selectGoal = (id) => {
    const g = findGoal(id);
    setGoalId(id);
    savePitchGoal(id, customGoal);
    setScenarioId(g.scenarios[0].id);
    setAudienceId(rememberedAudience(g, audienceMemory));
    setError("");
  };

  const changeCustomGoal = (value) => {
    const v = value.slice(0, CUSTOM_GOAL_MAX);
    setCustomGoal(v);
    savePitchGoal("other", v);
  };

  const selectScenario = (s) => {
    setScenarioId(s.id);
    if (s.defaultAudience) selectAudience(s.defaultAudience);
  };

  const handleGenerate = async () => {
    if (!goalLabel) {
      setError("Tell us what you're practising for.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const data = await generatePitch({
        role: profile.jobTitle,
        industry: profile.industry,
        ...pitchContext,
        scenarioType: scenarioDef.id,
        scenarioBrief: scenarioDef.brief,
        context: context.trim(),
      });
      setScenario(data);
      setResult(null);
      recorder.reset();
    } catch (e) {
      setError(e.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  // Score once recording stops
  useEffect(() => {
    if (recorder.state !== "stopped" || !scenario) return;
    if (!recorder.transcript) {
      setError("No speech detected. Please try again.");
      recorder.reset();
      return;
    }
    setScoring(true);
    setError("");
    scorePitch({
      scenario,
      transcript: recorder.transcript,
      durationSeconds: recorder.duration,
      ...pitchContext,
    })
      .then((data) => {
        setResult(data);
        const dateKey = todayKey();
        saveScore({
          id: crypto.randomUUID(),
          kind: "pitch",
          date: dateKey,
          passageTitle: scenario.title,
          passageTheme: scenario.scenarioType,
          goalLabel,
          audienceLabel: audience.label,
          scores: data.scores,
          feedback: data.feedback,
          recordedAt: new Date().toISOString(),
        });
        addPitchDate(dateKey);
      })
      .catch((e) => setError(e.message || "Scoring failed. Try again."))
      .finally(() => setScoring(false));
  }, [recorder.state]); // eslint-disable-line react-hooks/exhaustive-deps

  // Results → brief: keep the scenario, clear the result
  const handleBackToBrief = () => {
    setResult(null);
    setError("");
    recorder.reset();
  };

  // Brief → setup: keeps goal, audience, scenario type and context
  const handleChangeScenario = () => {
    if (recorder.state === "recording" && !window.confirm("Stop recording and go back? This take won't be scored.")) return;
    recorder.reset();
    setScenario(null);
    setResult(null);
    setError("");
  };

  if (loading) {
    return (
      <FullScreenStatus
        title="Setting the scene…"
        sub={`Building “${scenarioDef.id}” with ${toYour(audience.label)}…`}
      />
    );
  }
  if (scoring) return <FullScreenStatus title="Reviewing your pitch…" sub="Structure, focus, tone and confidence" />;

  // ── Results ────────────────────────────────────────────────────────────────
  if (result) {
    return (
      <article className="flex flex-col gap-6 animate-fade-up">
        <BackLink onClick={handleBackToBrief}>Back to the brief</BackLink>

        <ScoreCard
          scores={result.scores}
          feedback={result.feedback}
          dimensions={PITCH_DIMENSIONS}
          onRecordAgain={handleBackToBrief}
        />

        {result.swaps.length > 0 && (
          <section className="rounded-2xl border border-border bg-white/60 p-6 shadow-soft space-y-4">
            <Label>Say this instead</Label>
            {result.swaps.map((s, i) => (
              <div key={i} className="space-y-1">
                <p className="font-sans text-sm text-inkMuted line-through decoration-inkFaint">{s.from}</p>
                <p className="font-sans text-sm text-ink font-medium">{s.to}</p>
              </div>
            ))}
          </section>
        )}

        {result.strongerVersion && (
          <section className="rounded-2xl border border-border bg-white/60 p-6 shadow-soft space-y-3">
            <Label>How a seasoned {goal.role} would say it</Label>
            <p className="font-serif text-lg leading-[1.75] text-ink whitespace-pre-line">{result.strongerVersion}</p>
            <p className="font-sans text-xs text-inkFaint">Read it aloud a couple of times, then try your own version again.</p>
          </section>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <button type="button" className="btn-primary flex-1" onClick={handleBackToBrief}>Try this pitch again</button>
          <button type="button" className="btn-secondary flex-1" onClick={handleChangeScenario}>New scenario</button>
        </div>
      </article>
    );
  }

  // ── Scenario brief + recording ─────────────────────────────────────────────
  if (scenario) {
    const recording = recorder.state === "recording";
    const limit = Number(scenario.timeLimitSeconds) || 60;
    return (
      <article className="flex flex-col gap-6 animate-fade-up">
        <BackLink onClick={handleChangeScenario}>Change scenario</BackLink>

        <div className="space-y-1">
          <p className="font-sans text-xs uppercase tracking-[0.2em] text-accent">
            {goalLabel} · {scenario.scenarioType}
          </p>
          <h2 className="font-serif text-2xl sm:text-3xl text-ink leading-snug">{scenario.title}</h2>
        </div>

        <section className="rounded-2xl border border-border bg-white/60 p-6 shadow-soft space-y-5">
          <div className="space-y-1">
            <Label>{toYour(audience.label)}</Label>
            <p className="font-sans text-base text-ink font-semibold">
              {scenario.buyer?.name}, {scenario.buyer?.title}
            </p>
            <p className="font-sans text-sm text-inkMuted">
              {scenario.buyer?.company}{scenario.buyer?.companyDescription ? ` · ${scenario.buyer.companyDescription}` : ""}
            </p>
          </div>
          <p className="font-serif text-base text-ink leading-relaxed">{scenario.situation}</p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>{selling ? "You sell" : "Context"}</Label>
              <p className="font-sans text-sm text-ink">{scenario.product}</p>
            </div>
            <div className="space-y-1">
              <Label>Win condition</Label>
              <p className="font-sans text-sm text-ink">{scenario.goal}</p>
            </div>
          </div>
          {scenario.likelyObjection && (
            <div className="rounded-xl bg-accentSoft/40 border border-accent/20 px-4 py-3">
              <p className="font-sans text-xs text-inkMuted mb-0.5">Watch out for</p>
              <p className="font-sans text-sm text-ink">&ldquo;{scenario.likelyObjection}&rdquo;</p>
            </div>
          )}
        </section>

        {!recording && (
          <section className="grid sm:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-border bg-white/40 p-5 space-y-2">
              <Label>Hit these beats</Label>
              <ol className="list-decimal pl-5 space-y-1.5 font-sans text-sm text-ink">
                {(scenario.beats || []).map((b, i) => <li key={i}>{b}</li>)}
              </ol>
            </div>
            <div className="rounded-2xl border border-border bg-white/40 p-5 space-y-2">
              <Label>Phrases to try</Label>
              <ul className="space-y-1.5 font-sans text-sm text-ink">
                {(scenario.phrasesToTry || []).map((p, i) => <li key={i}>&ldquo;{p}&rdquo;</li>)}
              </ul>
            </div>
            {scenario.yourEdge && (
              <p className="sm:col-span-2 font-sans text-sm text-inkMuted leading-relaxed">
                <span className="font-semibold text-ink">Your edge: </span>{scenario.yourEdge}
              </p>
            )}
          </section>
        )}

        {/* Recorder */}
        <div className="rounded-2xl border border-border bg-white/70 px-5 py-4 flex items-center gap-4 shadow-sm">
          <div className="flex-1 min-w-0">
            <p className="font-sans text-sm font-semibold text-ink">
              {recording ? `You're on. Speak to ${toYour(audience.label)}.` : "Deliver it out loud"}
            </p>
            <p className="font-sans text-xs text-inkMuted">
              {recording
                ? `${formatSeconds(recorder.elapsed)} / ~${formatSeconds(limit)}`
                : `In your own words. Aim for about ${formatSeconds(limit)}.`}
            </p>
          </div>
          {recorder.state === "unsupported" ? (
            <p className="font-sans text-xs text-inkMuted">Not supported here</p>
          ) : recording ? (
            <button
              type="button"
              onClick={recorder.stop}
              className="shrink-0 rounded-xl bg-ink px-4 py-2 font-sans text-sm font-semibold text-white shadow-sm hover:bg-accent transition-colors"
            >
              Stop &amp; score
            </button>
          ) : (
            <button
              type="button"
              onClick={recorder.start}
              className="shrink-0 rounded-xl bg-accent px-4 py-2 font-sans text-sm font-semibold text-white shadow-sm hover:bg-accentDeep transition-colors"
            >
              {recorder.state === "error" ? "Retry" : "Start"}
            </button>
          )}
        </div>

        {recording && recorder.liveTranscript && (
          <p className="font-sans text-sm text-inkMuted leading-relaxed px-1">{recorder.liveTranscript}</p>
        )}

        {error && <p className="font-sans text-sm text-accent" role="alert">{error}</p>}
      </article>
    );
  }

  // ── Setup ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col animate-fade-up">
      <div className="flex-1 flex flex-col surface p-6 sm:p-8 gap-7">
        <div className="flex flex-col gap-3">
          <BackLink onClick={() => navigate("/")}>Today</BackLink>
          <div className="space-y-1">
            <p className="font-sans text-xs uppercase tracking-[0.2em] text-inkFaint">Pitch practice</p>
            <h1 className="font-serif text-3xl text-ink leading-tight">Talk like you&apos;re already in the role</h1>
            <p className="font-sans text-sm text-inkMuted leading-relaxed">
              Practising for <span className="text-ink font-medium">{goalLabel || "…"}</span>, speaking to{" "}
              <span className="text-ink font-medium">{toYour(audience.label)}</span>.
            </p>
          </div>
        </div>

        <div className="space-y-2.5">
          <Label>Practising for</Label>
          <div className="flex flex-wrap gap-2">
            {PITCH_GOALS.map((g) => (
              <button
                key={g.id}
                type="button"
                data-active={g.id === goalId}
                className="chip text-xs py-1.5 px-3.5"
                onClick={() => selectGoal(g.id)}
              >
                {g.label}
              </button>
            ))}
          </div>
          {goal.id === "other" && (
            <input
              className="input text-sm"
              value={customGoal}
              maxLength={CUSTOM_GOAL_MAX}
              onChange={(e) => changeCustomGoal(e.target.value)}
              placeholder='What are you practising for? e.g. "Developer relations"'
              autoFocus
            />
          )}
        </div>

        <div className="space-y-2.5">
          <Label>Who are you speaking to?</Label>
          <div className="flex flex-wrap gap-2">
            {goal.audiences.map((a) => (
              <button
                key={a.id}
                type="button"
                data-active={a.id === audience.id}
                className="chip text-xs py-1.5 px-3.5"
                onClick={() => selectAudience(a.id)}
              >
                {a.label}
              </button>
            ))}
          </div>
          <p className="font-sans text-xs text-inkFaint leading-relaxed">{audience.style}</p>
        </div>

        <div className="space-y-2.5">
          <Label>Scenario</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {goal.scenarios.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => selectScenario(s)}
                aria-pressed={scenarioDef.id === s.id}
                className={`rounded-xl border px-4 py-3 text-left transition ${
                  scenarioDef.id === s.id ? "border-accent bg-accentSoft/40" : "border-border bg-white/50 hover:border-accent/40"
                }`}
              >
                <span className="block font-sans text-sm font-semibold text-ink">{s.id}</span>
                <span className="block font-sans text-xs text-inkMuted mt-0.5">{s.hint}</span>
              </button>
            ))}
          </div>
        </div>

        <label className="flex flex-col gap-1.5">
          <Label>{selling ? "What are you selling? (optional)" : "Any context? (optional)"}</Label>
          <input
            className="input text-sm"
            value={context}
            maxLength={500}
            onChange={(e) => setContext(e.target.value)}
            placeholder={
              selling
                ? "Leave blank and we'll invent a SaaS product, or name the one you're interviewing for"
                : "e.g. the product area, the customer, what went wrong"
            }
          />
        </label>

        {error && <p className="text-sm text-accent" role="alert">{error}</p>}

        <button type="button" className="btn-primary w-full py-4 text-base mt-auto" onClick={handleGenerate}>
          Set the scene
        </button>
      </div>
    </div>
  );
}
