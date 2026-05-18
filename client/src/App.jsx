import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { loadProfile, loadReadDates } from "./lib/storage.js";
import Onboarding from "./pages/Onboarding.jsx";
import Home from "./pages/Home.jsx";
import Read from "./pages/Read.jsx";
import Favourites from "./pages/Favourites.jsx";
import Progress from "./pages/Progress.jsx";
import Settings from "./pages/Settings.jsx";
import AppShell from "./components/AppShell.jsx";
import { countReadsThisWeek } from "./lib/dates.js";

export default function App() {
  const [profile, setProfile] = useState(() => loadProfile());
  const [readDates, setReadDates] = useState(() => loadReadDates());

  const refreshProfile = useCallback(() => {
    setProfile(loadProfile());
  }, []);

  const refreshReads = useCallback(() => {
    setReadDates(loadReadDates());
  }, []);

  const streakContext = useMemo(
    () => ({
      profile,
      readDates,
      weekCount: countReadsThisWeek(readDates),
      allTimeCount: readDates.length,
      refreshProfile,
      refreshReads,
    }),
    [profile, readDates, refreshProfile, refreshReads]
  );

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === "articulate_read_dates" || e.key === "articulateProfile" || e.key === "articulate_profile") {
        setReadDates(loadReadDates());
        setProfile(loadProfile());
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    document.body.classList.toggle("dyslexia-mode", Boolean(profile?.dyslexiaMode));
    document.body.classList.toggle(
      "dyslexia-opendyslexic",
      Boolean(profile?.dyslexiaMode && profile?.dyslexiaFont === "opendyslexic")
    );
    document.body.classList.remove("font-size-large", "font-size-xlarge");
    if (profile?.fontSize === "large") document.body.classList.add("font-size-large");
    else if (profile?.fontSize === "xlarge") document.body.classList.add("font-size-xlarge");
  }, [profile]);

  if (!profile) {
    return (
      <Routes>
        <Route path="/onboarding" element={<Onboarding onComplete={refreshProfile} />} />
        <Route path="*" element={<Navigate to="/onboarding" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route
        element={
          <AppShell streak={streakContext}>
            <Outlet context={streakContext} />
          </AppShell>
        }
      >
        <Route index element={<Home />} />
        <Route path="read" element={<Read />} />
        <Route path="favourites" element={<Favourites />} />
        <Route path="progress" element={<Progress />} />
        <Route path="settings" element={<Settings onSaved={refreshProfile} />} />
      </Route>
      <Route path="/onboarding" element={<Navigate to="/" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
