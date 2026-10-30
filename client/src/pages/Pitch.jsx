import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { PITCH_DIMENSIONS, PITCH_SCENARIOS } from "../lib/constants.js";
import { generatePitch, scorePitch } from "../lib/api.js";
import { addReadDate, saveScore } from "../lib/storage.js";
import { todayKey } from "../lib/dates.js";
import { useRecorder } from "../hooks/useRecorder.js";
import ScoreCard from "../components/ScoreCard.jsx";

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

function formatSeconds(s) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export default function Pitch() {
  const { profile, refreshReads } = useOutletContext();
  const targetRole = profile.targetRole || "Tech sales (Account Executive)";

  const [scenarioType, setScenarioType] = useState(PITCH_SCENARIOS[0].id);
  const [product, setProduct] = useState("");
  const [scenario, setScenario] = useState(null);
  const [loading, setLoading] = useState(false);
  const [scoring, setScoring] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const recorder = useRecorder();

  const handleGenerate = async () => {
    setError("");
    setLoading(true);
    try {
      const data = await generatePitch({
        role: profile.jobTitle,
        industry: profile.industry,
        targetRole,
        scenarioType,
        product: product.trim(),
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
      targetRole,
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
          scores: data.scores,
          feedback: data.feedback,
          recordedAt: new Date().toISOString(),
        });
        addReadDate(dateKey);
        refreshReads();
      })
      .catch((e) => setError(e.message || "Scoring failed. Try again."))
      .finally(() => setScoring(false));
  }, [recorder.state]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleTryAgain = () => {
    setResult(null);
    setError("");
    recorder.reset();
  };

  const handleNewScenario = () => {
    setScenario(null);
    setResult(null);
    setError("");
    recorder.reset();
  };

  if (loading) return <FullScreenStatus title="Setting the scene…" sub={`Building a ${scenarioType.toLowerCase()} role-play`} />;
  if (scoring) return <FullScreenStatus title="Reviewing your pitch…" sub="Structure, value, sales voice and confidence" />;

  // ── Results ────────────────────────────────────────────────────────────────
  if (result) {
    return (
      <article className="space-y-6 animate-fade-up">
        <ScoreCard
          scores={result.scores}
          feedback={result.feedback}
          dimensions={PITCH_DIMENSIONS}
          onRecordAgain={handleTryAgain}
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
            <Label>How a seasoned rep would say it</Label>
            <p className="font-serif text-lg leading-[1.75] text-ink whitespace-pre-line">{result.strongerVersion}</p>
            <p className="font-sans text-xs text-inkFaint">Read it aloud a couple of times, then try your own version again.</p>
          </section>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <button type="button" className="btn-primary flex-1" onClick={handleTryAgain}>Try this pitch again</button>
          <button type="button" className="btn-secondary flex-1" onClick={handleNewScenario}>New scenario</button>
        </div>
      </article>
    );
  }

  // ── Scenario brief + recording ─────────────────────────────────────────────
  if (scenario) {
    const recording = recorder.state === "recording";
    const limit = Number(scenario.timeLimitSeconds) || 60;
    return (
      <article className="space-y-6 animate-fade-up">
        <div className="space-y-1">
          <p className="font-sans text-xs uppercase tracking-[0.2em] text-accent">{scenario.scenarioType}</p>
          <h2 className="font-serif text-2xl sm:text-3xl text-ink leading-snug">{scenario.title}</h2>
        </div>

        <section className="rounded-2xl border border-border bg-white/60 p-6 shadow-soft space-y-5">
          <div className="space-y-1">
            <Label>Your buyer</Label>
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
              <Label>You sell</Label>
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
              {recording ? "You're on. Speak to the buyer." : "Deliver your pitch out loud"}
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

        {!recording && (
          <button type="button" className="btn-secondary w-full" onClick={handleNewScenario}>
            New scenario
          </button>
        )}
      </article>
    );
  }

  // ── Setup ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col animate-fade-up">
      <div className="flex-1 flex flex-col surface p-6 sm:p-8 gap-7">
        <div className="space-y-1">
          <p className="font-sans text-xs uppercase tracking-[0.2em] text-inkFaint">Pitch practice</p>
          <h1 className="font-serif text-3xl text-ink leading-tight">Talk like you&apos;re already in the role</h1>
          <p className="font-sans text-sm text-inkMuted leading-relaxed">
            Practising for <span className="text-ink font-medium">{targetRole}</span>. You get a realistic buyer and
            situation, pitch out loud in your own words, then get coached on what a seasoned rep would say.
          </p>
        </div>

        <div className="space-y-2.5">
          <Label>Scenario</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {PITCH_SCENARIOS.map(({ id, hint }) => (
              <button
                key={id}
                type="button"
                onClick={() => setScenarioType(id)}
                aria-pressed={scenarioType === id}
                className={`rounded-xl border px-4 py-3 text-left transition ${
                  scenarioType === id ? "border-accent bg-accentSoft/40" : "border-border bg-white/50 hover:border-accent/40"
                }`}
              >
                <span className="block font-sans text-sm font-semibold text-ink">{id}</span>
                <span className="block font-sans text-xs text-inkMuted mt-0.5">{hint}</span>
              </button>
            ))}
          </div>
        </div>

        <label className="flex flex-col gap-1.5">
          <Label>What are you selling? (optional)</Label>
          <input
            className="input text-sm"
            value={product}
            onChange={(e) => setProduct(e.target.value)}
            placeholder="Leave blank and we'll invent a SaaS product, or name the one you're interviewing for"
          />
        </label>

        {!profile.targetRole && (
          <p className="font-sans text-xs text-inkFaint">
            Changing careers? Set the role you&apos;re pivoting into in Settings and your daily passages will be written in that voice too.
          </p>
        )}

        {error && <p className="text-sm text-accent" role="alert">{error}</p>}

        <button type="button" className="btn-primary w-full py-4 text-base mt-auto" onClick={handleGenerate}>
          Set the scene
        </button>
      </div>
    </div>
  );
}
