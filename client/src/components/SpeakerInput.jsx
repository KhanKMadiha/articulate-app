import { useEffect, useRef, useState } from "react";
import { ALL_SPEAKERS } from "../lib/constants.js";

/**
 * Inline chip-style input with autocomplete dropdown.
 * Appears as a dashed pill that flows with the chip list.
 * Hides itself when `selected` is already at `max`.
 */
export default function SpeakerInput({ selected, onAdd, max = 3 }) {
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  if (selected.length >= max) return null;

  const suggestions = value.trim()
    ? ALL_SPEAKERS.filter(
        (s) =>
          s.toLowerCase().includes(value.toLowerCase()) &&
          !selected.includes(s)
      ).slice(0, 6)
    : [];

  const commit = (name) => {
    const val = name ?? value.trim();
    if (!val || selected.includes(val)) return;
    onAdd(val);
    setValue("");
    setOpen(false);
    inputRef.current?.focus();
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <div className="flex items-center gap-1.5 rounded-full border border-dashed border-border bg-white/40 px-3.5 py-1.5">
        <input
          ref={inputRef}
          className="bg-transparent font-sans text-sm text-ink placeholder:text-inkFaint outline-none w-28 min-w-0"
          placeholder="Add someone…"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setOpen(true);
          }}
          onFocus={() => value.trim() && setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); commit(); }
            if (e.key === "Escape") setOpen(false);
            if (e.key === "ArrowDown" && suggestions.length > 0) {
              e.preventDefault();
              containerRef.current?.querySelector("[data-suggestion]")?.focus();
            }
          }}
        />
        {value.trim() && suggestions.length === 0 && (
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); commit(); }}
            className="font-sans text-xs font-semibold text-accent shrink-0"
          >
            Add
          </button>
        )}
      </div>

      {open && suggestions.length > 0 && (
        <div className="absolute left-0 top-full mt-1.5 z-50 w-52 rounded-xl border border-border bg-white shadow-card overflow-hidden">
          {suggestions.map((name, i) => (
            <button
              key={name}
              type="button"
              data-suggestion
              onMouseDown={(e) => { e.preventDefault(); commit(name); }}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); commit(name); }
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  const next = containerRef.current?.querySelectorAll("[data-suggestion]")[i + 1];
                  next ? next.focus() : inputRef.current?.focus();
                }
                if (e.key === "ArrowUp") {
                  e.preventDefault();
                  const prev = containerRef.current?.querySelectorAll("[data-suggestion]")[i - 1];
                  prev ? prev.focus() : inputRef.current?.focus();
                }
                if (e.key === "Escape") { setOpen(false); inputRef.current?.focus(); }
              }}
              className="w-full text-left px-4 py-2.5 font-sans text-sm text-ink hover:bg-accentSoft focus:bg-accentSoft outline-none transition-colors"
            >
              {name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
