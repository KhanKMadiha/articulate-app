import { useEffect, useRef, useState } from "react";
import React from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { scorePassage } from "../lib/api.js";
import {
  addReadDate,
  clearSession,
  loadFavourites,
  loadSession,
  saveFavourites,
  saveScore,
  saveSession,
} from "../lib/storage.js";
import { todayKey } from "../lib/dates.js";
import { useRecorder } from "../hooks/useRecorder.js";
import ScoreCard from "../components/ScoreCard.jsx";

// ── Dyslexia helpers ──────────────────────────────────────────────────────────

function syllabify(word) {
  // Insert · after vowel+consonant(s) when followed by another vowel
  return word.replace(/([aeiou]+)([bcdfghjklmnpqrstvwxyz]+)(?=[aeiou])/gi, "$1$2·");
}

function countWords(text) {
  return text ? text.trim().split(/\s+/).filter(Boolean).length : 0;
}

// Renders a paragraph with optional word highlighting and syllable breaks.
// startWordIndex = how many passage words came before this paragraph (for global index).
// highlightUpTo = total spoken word count so far.
function ParagraphText({ text, startWordIndex, highlightUpTo, showSyllables }) {
  const parts = [];
  const regex = /([A-Za-z\u2019'-]+)|([^A-Za-z\u2019'-]+)/g;
  let wordIdx = startWordIndex;
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match[1]) {
      const word = match[1];
      const isSpoken = wordIdx < highlightUpTo;
      const isCurrent = wordIdx === highlightUpTo;
      const cls = isSpoken ? "word-spoken" : isCurrent ? "word-current" : undefined;
      if (showSyllables) {
        const sylParts = syllabify(word).split("·");
        parts.push(
          <span key={wordIdx} className={cls}>
            {sylParts.map((s, i) => (
              <React.Fragment key={i}>
                {i > 0 && <span className="syl-dot" aria-hidden>·</span>}
                {s}
              </React.Fragment>
            ))}
          </span>
        );
      } else {
        parts.push(<span key={wordIdx} className={cls}>{word}</span>);
      }
      wordIdx++;
    } else {
      parts.push(<React.Fragment key={`p${match.index}`}>{match[2]}</React.Fragment>);
    }
  }
  return <>{parts}</>;
}

const MOTIVATIONAL = [
  { headline: "That's a streak.", sub: "Every rep counts. You showed up today." },
  { headline: "Well done.", sub: "Consistency is the whole game. You're playing it." },
  { headline: "One more day.", sub: "Small habits, big voice. Keep going." },
  { headline: "You did the work.", sub: "Most people won't. You did." },
  { headline: "Progress made.", sub: "Your future self will thank you for today." },
];

export default function Read() {
  const { refreshReads, profile } = useOutletContext();
  const dyslexiaMode = profile?.dyslexiaMode ?? false;
  const navigate = useNavigate();

  // ── All hooks first, unconditionally ──────────────────────────────────────
  const [completedToday, setCompletedToday] = useState(false);
  const [saved, setSaved] = useState(false);
  const [heartKey, setHeartKey] = useState(0);
  const [scoreResult, setScoreResult] = useState(null);
  const [scoring, setScoring] = useState(false);
  const [scoreError, setScoreError] = useState("");
  const [focusDismissed, setFocusDismissed] = useState(false);
  const [wellDone, setWellDone] = useState(false);
  const [sessionDone, setSessionDone] = useState(false);

  // Dyslexia mode reading aids
  const [paraIndex, setParaIndex] = useState(0);
  const [showRuler, setShowRuler] = useState(false);
  const [showSyllables, setShowSyllables] = useState(false);

  const scrollBarRef = useRef(null);
  const wellDoneFired = useRef(false);
  const motivational = useRef(MOTIVATIONAL[Math.floor(Math.random() * MOTIVATIONAL.length)]).current;

  const recorder = useRecorder();
  const dateKey = todayKey();

  // Load session once
  const session = loadSession();
  const passage = session?.passage ?? null;

  // Sync completedToday from session on mount
  useEffect(() => {
    if (session?.completedToday) setCompletedToday(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Redirect home if no passage
  useEffect(() => {
    if (!passage) navigate("/", { replace: true });
  }, [passage, navigate]);

  // Scroll progress bar (direct DOM, no re-render)
  useEffect(() => {
    if (recorder.state !== "recording") {
      if (scrollBarRef.current) {
        scrollBarRef.current.style.background = "linear-gradient(to bottom, #B45309 0%, #E7E5E4 0%)";
      }
      return;
    }
    const onScroll = () => {
      if (!scrollBarRef.current) return;
      const total = document.documentElement.scrollHeight - window.innerHeight;
      const pct = Math.round(Math.min(total > 0 ? window.scrollY / total : 0, 1) * 100);
      scrollBarRef.current.style.background =
        `linear-gradient(to bottom, #B45309 ${pct}%, #E7E5E4 ${pct}%)`;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [recorder.state]);

  // Scoring effect
  useEffect(() => {
    if (recorder.state !== "stopped") return;
    if (!passage) return;
    if (!recorder.transcript) {
      setScoreError("No speech detected. Please try again.");
      recorder.reset();
      return;
    }
    setScoring(true);
    setScoreError("");
    scorePassage({
      passageText: passage.passageText,
      transcript: recorder.transcript,
      durationSeconds: recorder.duration,
      expectedMinutes: passage.readTimeMinutes,
    })
      .then((result) => {
        setScoring(false);   // batch with the other updates so well-done shows first
        setScoreResult(result);
        if (!wellDoneFired.current) {
          wellDoneFired.current = true;
          setWellDone(true);
        }
        saveScore({
          id: crypto.randomUUID(),
          date: dateKey,
          passageTitle: passage.title,
          passageTheme: passage.theme,
          scores: result.scores,
          feedback: result.feedback,
          recordedAt: new Date().toISOString(),
        });
      })
      .catch((e) => {
        setScoring(false);
        setScoreError(e.message || "Scoring failed. Try again.");
      });
  }, [recorder.state]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleMarkRead = () => {
    addReadDate(dateKey);
    refreshReads();
    setCompletedToday(true);
    const s = loadSession();
    if (s) saveSession({ ...s, completedToday: true });
    if (recorder.state === "recording") {
      recorder.stop(); // scoring effect will show well-done after scoring
    } else {
      setSessionDone(true); // covers both no-recording and post-score flows
    }
  };

  const handleSave = () => {
    if (saved || !passage) return;
    const list = loadFavourites();
    saveFavourites([
      {
        id: crypto.randomUUID(),
        title: passage.title,
        sourceLabel: passage.sourceLabel,
        passageText: passage.passageText,
        focusTip: passage.focusTip,
        readTimeMinutes: passage.readTimeMinutes,
        theme: passage.theme,
        savedAt: new Date().toISOString(),
      },
      ...list,
    ]);
    setSaved(true);
    setHeartKey((k) => k + 1);
  };

  const handleNew = () => {
    clearSession();
    navigate("/");
  };

  const handleRecordAgain = () => {
    setScoreResult(null);
    setScoreError("");
    recorder.reset();
  };

  // ── Render guards ─────────────────────────────────────────────────────────
  if (!passage) return null;

  // Scoring overlay
  if (scoring) {
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
        <p className="font-serif text-2xl text-ink">Scoring your reading…</p>
        <p className="font-sans text-sm text-inkMuted">Analysing accuracy, fluency and pace</p>
      </div>
    );
  }

  // Well-done overlay (after scoring)
  if (wellDone) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-paper/90 backdrop-blur-sm px-6"
        onClick={() => setWellDone(false)}
      >
        <div className="text-center space-y-5 max-w-xs">
          <div className="text-5xl">🎉</div>
          <p className="font-serif text-3xl text-ink">{motivational.headline}</p>
          <p className="font-sans text-base text-inkMuted leading-relaxed">{motivational.sub}</p>
          <p className="font-sans text-xs text-inkFaint pt-4">Tap anywhere to see your results</p>
        </div>
      </div>
    );
  }

  // Session done
  if (sessionDone) {
    const withScore = !!scoreResult;
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-paper px-8">
        {/* Top spacer */}
        <div className="flex-1" />

        {/* Content */}
        <div className="space-y-6 text-center">
          <div className="w-16 h-px bg-accent mx-auto" />
          <div className="space-y-3">
            <p className="font-serif text-5xl text-ink leading-tight">See you<br />tomorrow.</p>
            <p className="font-sans text-base text-inkMuted leading-relaxed max-w-xs mx-auto">
              {withScore
                ? "You read it, you recorded it, you improved. That's the whole game."
                : "Another day, another step toward the speaker you're becoming."}
            </p>
          </div>
          <div className="w-16 h-px bg-border mx-auto" />
        </div>

        {/* Bottom actions */}
        <div className="flex-1 flex flex-col justify-end pb-12 gap-3 max-w-sm mx-auto w-full">
          <button type="button" className="btn-primary w-full" onClick={handleNew}>
            New passage
          </button>
          <button type="button" className="btn-secondary w-full" onClick={() => navigate("/")}>
            End session
          </button>
        </div>
      </div>
    );
  }

  // Score view
  if (scoreResult) {
    return (
      <article className="space-y-8">
        <ScoreCard
          scores={scoreResult.scores}
          feedback={scoreResult.feedback}
          onRecordAgain={handleRecordAgain}
        />
        <div className="flex flex-col sm:flex-row gap-3">
          {completedToday ? (
            <button
              type="button"
              className="btn-primary flex-1"
              onClick={() => setSessionDone(true)}
            >
              Finish session
            </button>
          ) : (
            <button
              type="button"
              className="btn-primary flex-1"
              onClick={handleMarkRead}
            >
              Mark as read
            </button>
          )}
          <div className="relative flex-1 flex">
            {heartKey > 0 && (
              <span key={heartKey} className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="animate-heart-burst text-2xl text-accent">♥</span>
              </span>
            )}
            {!saved ? (
              <button type="button" className="btn-secondary w-full" onClick={handleSave}>
                Save to favourites
              </button>
            ) : (
              <span className="flex-1 flex items-center justify-center font-sans text-sm text-inkMuted py-3">
                ♥ Saved to Library
              </span>
            )}
          </div>
        </div>
        <button type="button" className="btn-secondary w-full" onClick={handleNew}>
          New passage
        </button>
      </article>
    );
  }

  // Focus bubble
  if (!focusDismissed) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-paper/80 backdrop-blur-sm px-6">
        <div className="relative w-full max-w-sm">
          <div className="rounded-3xl bg-white shadow-card border border-border px-7 py-8 text-center space-y-4">
            <p className="font-sans text-[10px] uppercase tracking-[0.22em] text-accent font-semibold">
              Today's focus
            </p>
            <p className="font-serif text-xl text-ink leading-relaxed">{passage.focusTip}</p>
            <button
              type="button"
              className="btn-primary w-full mt-2"
              onClick={() => setFocusDismissed(true)}
            >
              Got it, show my passage
            </button>
          </div>
          <div
            className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 bg-white border-r border-b border-border rotate-45 rounded-br-sm"
            aria-hidden
          />
        </div>
      </div>
    );
  }

  // Passage view
  const paragraphs = (passage.passageText || "").split(/\n\n+/).filter(Boolean);

  // Word counts per paragraph (for highlight offset tracking)
  const wordCountPerPara = paragraphs.map(countWords);
  const wordOffsetPerPara = wordCountPerPara.reduce((acc, _, i) => {
    acc.push(i === 0 ? 0 : acc[i - 1] + wordCountPerPara[i - 1]);
    return acc;
  }, []);
  const spokenWordCount = countWords(recorder.liveTranscript);

  // Which paragraphs to show
  const visibleParas = dyslexiaMode
    ? [paragraphs[paraIndex]].filter(Boolean)
    : paragraphs;
  const visibleOffset = dyslexiaMode ? wordOffsetPerPara[paraIndex] ?? 0 : 0;
  const isLastPara = paraIndex >= paragraphs.length - 1;

  const actions = (
    <div className="flex flex-col sm:flex-row gap-3">
      <button
        type="button"
        className="btn-primary flex-1"
        onClick={handleMarkRead}
        disabled={completedToday}
      >
        {completedToday ? "Logged for today" : "Mark as read"}
      </button>
      <div className="relative flex-1 flex">
        {heartKey > 0 && (
          <span key={heartKey} className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="animate-heart-burst text-2xl text-accent">♥</span>
          </span>
        )}
        {!saved ? (
          <button type="button" className="btn-secondary w-full" onClick={handleSave}>
            Save to favourites
          </button>
        ) : (
          <span className="flex-1 flex items-center justify-center font-sans text-sm text-inkMuted py-3">
            ♥ Saved to Library
          </span>
        )}
      </div>
    </div>
  );

  return (
    <article className="space-y-8">
      {/* Reading ruler */}
      {showRuler && <div className="reading-ruler" aria-hidden />}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <p className="font-sans text-xs uppercase tracking-[0.2em] text-accent">{passage.theme}</p>
          <h2 className="font-serif text-2xl sm:text-3xl text-ink leading-snug">{passage.title}</h2>
          <p className="font-sans text-sm text-inkMuted">{passage.sourceLabel}</p>
        </div>
        <p className="shrink-0 rounded-full border border-border bg-white/70 px-3 py-1 font-sans text-xs text-inkMuted">
          ~{passage.readTimeMinutes} min
        </p>
      </div>

      {/* Side progress bar — visible while recording */}
      {recorder.state === "recording" && (
        <div className="fixed right-4 top-1/2 -translate-y-1/2 z-40 flex flex-col items-center gap-3">
          <div
            ref={scrollBarRef}
            className="w-1.5 h-36 rounded-full"
            style={{ background: "linear-gradient(to bottom, #B45309 0%, #E7E5E4 0%)" }}
          />
          <button
            type="button"
            onClick={recorder.stop}
            className="w-9 h-9 rounded-full bg-ink flex items-center justify-center shadow-soft hover:bg-accent transition-colors"
            aria-label="Stop recording"
          >
            <span className="w-3 h-3 rounded-sm bg-white" />
          </button>
        </div>
      )}

      {/* Record card */}
      {recorder.state !== "recording" && (
        <div className="rounded-2xl border border-border bg-white/70 px-5 py-4 flex items-center gap-4 shadow-sm">
          <div className="w-10 h-10 rounded-full bg-accentSoft flex items-center justify-center shrink-0">
            <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.8} stroke="currentColor" className="w-5 h-5 text-accent">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-sans text-sm font-semibold text-ink">Record your reading</p>
            <p className="font-sans text-xs text-inkMuted">Start before you read. We'll score your delivery.</p>
          </div>
          {recorder.state === "unsupported" ? (
            <p className="font-sans text-xs text-inkMuted">Not supported here</p>
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
      )}
      {scoreError && <p className="font-sans text-xs text-accent">{scoreError}</p>}

      {/* Dyslexia reading aids toolbar */}
      {dyslexiaMode && (
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setShowRuler((r) => !r)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-sans text-xs font-medium border transition-all ${
              showRuler ? "border-accent bg-accentSoft text-ink" : "border-border bg-white/60 text-inkMuted"
            }`}
          >
            📏 Ruler
          </button>
          <button
            type="button"
            onClick={() => setShowSyllables((s) => !s)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-sans text-xs font-medium border transition-all ${
              showSyllables ? "border-accent bg-accentSoft text-ink" : "border-border bg-white/60 text-inkMuted"
            }`}
          >
            Aa Syllables
          </button>
          {dyslexiaMode && (
            <span className="font-sans text-xs text-inkFaint ml-auto">
              {paraIndex + 1} / {paragraphs.length}
            </span>
          )}
        </div>
      )}

      {/* Passage text */}
      <div className="rounded-2xl border border-border bg-white/60 p-6 sm:p-8 shadow-soft passage-container">
        <div className="font-serif text-lg sm:text-[1.125rem] leading-[1.75] text-ink passage-text">
          {visibleParas.map((para, i) => {
            const globalIndex = dyslexiaMode ? paraIndex : i;
            const offset = wordOffsetPerPara[globalIndex] ?? 0;
            return (
              <p key={globalIndex} className={i > 0 ? "dyslexia-para" : undefined} style={i > 0 && !dyslexiaMode ? { marginTop: "1.25rem" } : undefined}>
                <ParagraphText
                  text={para}
                  startWordIndex={offset}
                  highlightUpTo={spokenWordCount}
                  showSyllables={showSyllables}
                />
              </p>
            );
          })}
        </div>
      </div>

      {/* Paragraph navigation (dyslexia mode) */}
      {dyslexiaMode && (
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="btn-secondary flex-1"
            disabled={paraIndex === 0}
            onClick={() => setParaIndex((i) => Math.max(0, i - 1))}
          >
            ← Previous
          </button>
          {isLastPara ? (
            <span className="flex-1 text-center font-sans text-xs text-inkMuted py-3">Last paragraph</span>
          ) : (
            <button
              type="button"
              className="btn-primary flex-1"
              onClick={() => setParaIndex((i) => Math.min(paragraphs.length - 1, i + 1))}
            >
              Next →
            </button>
          )}
        </div>
      )}

      {/* Actions — always visible in standard mode; visible on last para in dyslexia mode */}
      {(!dyslexiaMode || isLastPara) && actions}

      {(!dyslexiaMode || isLastPara) && (
        <button type="button" className="btn-secondary w-full" onClick={handleNew}>
          New passage
        </button>
      )}
    </article>
  );
}
