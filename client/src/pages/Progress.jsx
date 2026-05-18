import { useState } from "react";
import { loadScores } from "../lib/storage.js";

function scoreColor(n) {
  if (n >= 8) return "text-emerald-700 bg-emerald-50 border-emerald-200";
  if (n >= 6) return "text-amber-700 bg-amber-50 border-amber-200";
  return "text-red-700 bg-red-50 border-red-200";
}

function ScorePill({ score, label }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className={`inline-flex items-center justify-center w-9 h-9 rounded-full border font-sans font-bold text-sm ${scoreColor(score)}`}>
        {score}
      </span>
      <span className="font-sans text-[10px] text-inkMuted">{label}</span>
    </div>
  );
}

function ScoreEntry({ entry }) {
  const [open, setOpen] = useState(false);
  const date = new Date(entry.recordedAt);
  const formatted = date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

  return (
    <div className="rounded-2xl border border-border bg-white/60 shadow-soft overflow-hidden">
      <button
        type="button"
        className="w-full text-left px-5 py-4 flex items-center justify-between gap-4"
        onClick={() => setOpen((o) => !o)}
      >
        <div className="min-w-0 space-y-0.5">
          <p className="font-sans text-xs text-inkMuted">{formatted} · {entry.passageTheme}</p>
          <p className="font-serif text-base text-ink leading-snug truncate">{entry.passageTitle}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className={`inline-flex items-center justify-center w-10 h-10 rounded-full border-2 font-sans font-bold text-base ${scoreColor(entry.scores.overall)}`}>
            {entry.scores.overall}
          </span>
          <span className="text-inkMuted text-sm">{open ? "▲" : "▼"}</span>
        </div>
      </button>

      {open && (
        <div className="border-t border-border px-5 py-4 space-y-4">
          <p className="font-serif text-base text-ink leading-relaxed">{entry.feedback.summary}</p>

          <div className="flex gap-4 justify-around py-2">
            <ScorePill score={entry.scores.accuracy} label="Accuracy" />
            <ScorePill score={entry.scores.fluency} label="Fluency" />
            <ScorePill score={entry.scores.pace} label="Pace" />
          </div>

          <div className="space-y-3 border-t border-border pt-4">
            {[
              { label: "Accuracy", score: entry.scores.accuracy, text: entry.feedback.accuracy },
              { label: "Fluency", score: entry.scores.fluency, text: entry.feedback.fluency },
              { label: "Pace", score: entry.scores.pace, text: entry.feedback.pace },
            ].map(({ label, score, text }) => (
              <div key={label} className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full border font-sans font-semibold text-xs ${scoreColor(score)}`}>
                    {score}
                  </span>
                  <span className="font-sans text-sm font-semibold text-ink">{label}</span>
                </div>
                <p className="font-sans text-sm text-inkMuted leading-relaxed pl-7">{text}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Progress() {
  const scores = loadScores();

  return (
    <div className="space-y-8">
      <section className="space-y-1">
        <p className="font-sans text-xs uppercase tracking-[0.2em] text-inkMuted">Your journey</p>
        <h1 className="font-serif text-3xl text-ink leading-tight">Progress</h1>
        <p className="font-sans text-inkMuted leading-relaxed">
          Every session scored. Tap an entry to see the full feedback.
        </p>
      </section>

      {scores.length === 0 ? (
        <div className="rounded-2xl border border-border bg-white/50 p-8 text-center space-y-2">
          <p className="font-serif text-lg text-ink">No scores yet</p>
          <p className="font-sans text-sm text-inkMuted">
            Record yourself reading a passage and your scores will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {scores.map((entry) => (
            <ScoreEntry key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </div>
  );
}
