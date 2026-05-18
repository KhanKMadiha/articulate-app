import { useMemo, useState } from "react";
import { loadFavourites, saveFavourites } from "../lib/storage.js";

export default function Favourites() {
  const [items, setItems] = useState(() => loadFavourites());

  const sorted = useMemo(
    () => [...items].sort((a, b) => String(b.savedAt).localeCompare(String(a.savedAt))),
    [items]
  );

  const remove = (id) => {
    const next = items.filter((x) => x.id !== id);
    setItems(next);
    saveFavourites(next);
  };

  if (!sorted.length) {
    return (
      <div className="space-y-4 py-8">
        <h1 className="font-serif text-3xl text-ink">Library</h1>
        <p className="font-sans text-inkMuted leading-relaxed max-w-md">
          Passages you save land here for a second read or a rehearsal before a big moment. Nothing yet — finish a
          day&apos;s piece and tap &quot;Save to favourites.&quot;
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="font-sans text-xs uppercase tracking-[0.2em] text-inkMuted mb-1">Saved</p>
        <h1 className="font-serif text-3xl text-ink">Library</h1>
      </div>

      <ul className="space-y-6">
        {sorted.map((item) => (
          <li key={item.id} className="rounded-2xl border border-border bg-white/50 shadow-soft overflow-hidden">
            <div className="px-5 py-4 space-y-1">
              <span className="font-sans text-xs uppercase tracking-wider text-accent">{item.theme || "Passage"}</span>
              <h2 className="font-serif text-xl text-ink">{item.title}</h2>
              <p className="font-sans text-sm text-inkMuted">{item.sourceLabel}</p>
            </div>
            <details className="group border-t border-border bg-paper/80">
              <summary className="cursor-pointer list-none px-5 py-3 font-sans text-sm font-medium text-accent marker:content-none flex items-center justify-between">
                <span>Read passage</span>
                <span className="text-inkMuted group-open:rotate-180 transition-transform" aria-hidden>
                  ▾
                </span>
              </summary>
              <div className="px-5 pb-5 pt-0 space-y-4">
                <div className="font-serif text-base leading-relaxed text-ink space-y-4">
                  {String(item.passageText)
                    .split(/\n\n+/)
                    .filter(Boolean)
                    .map((p, i) => (
                      <p key={i}>{p}</p>
                    ))}
                </div>
                <p className="font-sans text-sm text-inkMuted border-l-2 border-accent pl-3">{item.focusTip}</p>
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <span className="text-xs text-inkMuted">
                    Saved {new Date(item.savedAt).toLocaleDateString(undefined, { dateStyle: "medium" })}
                  </span>
                  <button type="button" className="text-sm text-accent hover:underline" onClick={() => remove(item.id)}>
                    Remove
                  </button>
                </div>
              </div>
            </details>
          </li>
        ))}
      </ul>
    </div>
  );
}
