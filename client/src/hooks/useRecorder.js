import { useCallback, useEffect, useRef, useState } from "react";

// idle → recording → stopped → (caller handles scoring) → reset back to idle
// unsupported: browser doesn't have SpeechRecognition
// error: recognition threw a fatal error

const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

export function useRecorder() {
  const [state, setState] = useState("idle");
  const [transcript, setTranscript] = useState("");
  const [liveTranscript, setLiveTranscript] = useState("");
  const [duration, setDuration] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  const recRef = useRef(null);
  const accumulated = useRef("");
  const startTime = useRef(null);
  const active = useRef(false); // true while user wants recording to continue

  const buildRecognition = useCallback(() => {
    const r = new SR();
    r.continuous = true;
    r.interimResults = true;
    r.lang = "en-GB";

    r.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          accumulated.current += e.results[i][0].transcript + " ";
        } else {
          interim += e.results[i][0].transcript;
        }
      }
      setLiveTranscript((accumulated.current + " " + interim).trim());
    };

    // iOS Safari stops recognition after silence — restart automatically
    r.onend = () => {
      if (active.current) {
        try { r.start(); } catch {}
      } else {
        const final = accumulated.current.trim();
        setTranscript(final);
        setLiveTranscript(final);
        setState("stopped");
      }
    };

    r.onerror = (e) => {
      if (e.error === "no-speech" || e.error === "aborted") return;
      active.current = false;
      setState("error");
    };

    return r;
  }, []);

  const start = useCallback(() => {
    if (!SR) { setState("unsupported"); return; }
    accumulated.current = "";
    startTime.current = Date.now();
    active.current = true;

    const r = buildRecognition();
    recRef.current = r;
    try {
      r.start();
      setState("recording");
    } catch {
      setState("error");
    }
  }, [buildRecognition]);

  const stop = useCallback(() => {
    active.current = false;
    const elapsed = startTime.current ? (Date.now() - startTime.current) / 1000 : 0;
    setDuration(elapsed);
    try {
      if (recRef.current) recRef.current.stop();
    } catch {
      // If stop() throws, manually finalise
      setTranscript(accumulated.current.trim());
      setState("stopped");
    }
  }, []);

  const reset = useCallback(() => {
    active.current = false;
    try { if (recRef.current) recRef.current.abort(); } catch {}
    recRef.current = null;
    accumulated.current = "";
    startTime.current = null;
    setState("idle");
    setTranscript("");
    setLiveTranscript("");
    setDuration(0);
  }, []);

  // Tick elapsed seconds while recording
  useEffect(() => {
    if (state !== "recording") { setElapsed(0); return; }
    const id = setInterval(() => {
      setElapsed(startTime.current ? Math.floor((Date.now() - startTime.current) / 1000) : 0);
    }, 1000);
    return () => clearInterval(id);
  }, [state]);

  useEffect(() => {
    return () => {
      active.current = false;
      try { if (recRef.current) recRef.current.abort(); } catch {}
    };
  }, []);

  return {
    state,       // "idle" | "recording" | "stopped" | "error" | "unsupported"
    transcript,
    liveTranscript, // combined final + interim transcript, updates while recording
    duration,
    elapsed,     // live seconds since recording started
    isSupported: Boolean(SR),
    start,
    stop,
    reset,
  };
}
