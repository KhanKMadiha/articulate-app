function scoreColor(n) {
  if (n >= 8) return "text-emerald-700 bg-emerald-50 border-emerald-200";
  if (n >= 6) return "text-amber-700 bg-amber-50 border-amber-200";
  return "text-red-700 bg-red-50 border-red-200";
}

function ScoreBadge({ score, label }) {
  return (
    <div className="flex flex-col items-center gap-1 min-w-0">
      <span
        className={`inline-flex items-center justify-center w-12 h-12 rounded-full border-2 font-sans font-bold text-lg ${scoreColor(score)}`}
      >
        {score}
      </span>
      <span className="font-sans text-xs text-inkMuted text-center">{label}</span>
    </div>
  );
}

function FeedbackRow({ label, score, text }) {
  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-2">
        <span
          className={`inline-flex items-center justify-center w-6 h-6 rounded-full border font-sans font-semibold text-xs ${scoreColor(score)}`}
        >
          {score}
        </span>
        <span className="font-sans text-sm font-semibold text-ink">{label}</span>
      </div>
      <p className="font-sans text-sm text-inkMuted leading-relaxed pl-8">{text}</p>
    </div>
  );
}

export default function ScoreCard({ scores, feedback, onRecordAgain }) {
  return (
    <div className="rounded-2xl border border-border bg-white/60 p-6 shadow-soft space-y-6">
      {/* Header row */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-sans text-xs uppercase tracking-[0.2em] text-accent mb-0.5">Your score</p>
          <p className="font-serif text-2xl text-ink font-medium">{scores.overall} / 10</p>
        </div>
        <div className="flex gap-4">
          <ScoreBadge score={scores.accuracy} label="Accuracy" />
          <ScoreBadge score={scores.fluency} label="Fluency" />
          <ScoreBadge score={scores.pace} label="Pace" />
        </div>
      </div>

      {/* Summary */}
      <p className="font-serif text-base text-ink leading-relaxed">{feedback.summary}</p>

      {/* Per-dimension feedback */}
      <div className="space-y-4 border-t border-border pt-4">
        <FeedbackRow label="Accuracy" score={scores.accuracy} text={feedback.accuracy} />
        <FeedbackRow label="Fluency" score={scores.fluency} text={feedback.fluency} />
        <FeedbackRow label="Pace" score={scores.pace} text={feedback.pace} />
      </div>

      <button type="button" className="btn-secondary w-full" onClick={onRecordAgain}>
        Record again
      </button>
    </div>
  );
}
