const PROFILE_KEY = "articulateProfile";
const SCORES_KEY = "articulate_scores";
const LEGACY_PROFILE_KEY = "articulate_profile";
const FAVOURITES_KEY = "articulate_favourites";
const READ_DATES_KEY = "articulate_read_dates";
const SESSION_KEY = "articulate_session";

function isValidReadingStyle(v) {
  return v === "direct" || v === "checkin";
}

function isValidPassageLength(v) {
  return v === "short" || v === "medium" || v === "long";
}

function isValidDyslexiaFont(v) {
  return v === "lexend" || v === "opendyslexic";
}

function isValidFontSize(v) {
  return v === "normal" || v === "large" || v === "xlarge";
}

function normalizeProfile(p) {
  const name = String(p?.name ?? "").trim();
  const jobTitle = String(p?.jobTitle ?? "").trim();
  const industry = String(p?.industry ?? "").trim();
  const careerGoal = String(p?.careerGoal ?? "").trim();
  if (!name || !jobTitle || !industry || !careerGoal) return null;
  const focusAreas = Array.isArray(p.focusAreas) ? p.focusAreas.map(String).map((s) => s.trim()).filter(Boolean) : [];
  if (focusAreas.length < 1 || focusAreas.length > 3) return null;
  const speakingInspirations = Array.isArray(p.speakingInspirations)
    ? p.speakingInspirations.map(String).map((s) => s.trim()).filter(Boolean).slice(0, 3)
    : [];
  const readingStyle = p.readingStyle;
  const passageLength = p.passageLength;
  if (!isValidReadingStyle(readingStyle)) return null;
  if (!isValidPassageLength(passageLength)) return null;
  return {
    name,
    jobTitle,
    industry,
    careerGoal,
    focusAreas: focusAreas.slice(0, 3),
    speakingInspirations,
    readingStyle,
    passageLength,
    dyslexiaMode: Boolean(p?.dyslexiaMode ?? false),
    dyslexiaFont: isValidDyslexiaFont(p?.dyslexiaFont) ? p.dyslexiaFont : "lexend",
    fontSize: isValidFontSize(p?.fontSize) ? p.fontSize : "normal",
  };
}

function migrateLegacyProfile() {
  try {
    const raw = localStorage.getItem(LEGACY_PROFILE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (!p?.name || !p?.jobRole || !p?.industry || !p?.goals) return null;
    const topics = Array.isArray(p.topics) ? p.topics.map(String).filter(Boolean) : [];
    const focusAreas =
      topics.length >= 1
        ? topics.slice(0, 3)
        : ["Executive communication", "Confidence & presence", "Technical leadership"];
    const migrated = {
      name: String(p.name).trim(),
      jobTitle: String(p.jobRole).trim(),
      industry: String(p.industry).trim(),
      careerGoal: String(p.goals).trim(),
      focusAreas: focusAreas.slice(0, 3),
      readingStyle: "checkin",
      passageLength: "medium",
    };
    localStorage.setItem(PROFILE_KEY, JSON.stringify(migrated));
    localStorage.removeItem(LEGACY_PROFILE_KEY);
    return migrated;
  } catch {
    return null;
  }
}

export function loadProfile() {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      return normalizeProfile(p);
    }
    return migrateLegacyProfile();
  } catch {
    return null;
  }
}

export function saveProfile(profile) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  localStorage.removeItem(LEGACY_PROFILE_KEY);
}

export function loadFavourites() {
  try {
    const raw = localStorage.getItem(FAVOURITES_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function saveFavourites(list) {
  localStorage.setItem(FAVOURITES_KEY, JSON.stringify(list));
}

export function loadReadDates() {
  try {
    const raw = localStorage.getItem(READ_DATES_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return [...new Set(arr.map(String))].sort();
  } catch {
    return [];
  }
}

export function addReadDate(yyyyMmDd) {
  const dates = new Set(loadReadDates());
  dates.add(yyyyMmDd);
  const sorted = [...dates].sort();
  localStorage.setItem(READ_DATES_KEY, JSON.stringify(sorted));
  return sorted;
}

export function loadSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveSession(data) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(data));
}

export function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
}

export function loadScores() {
  try {
    const raw = localStorage.getItem(SCORES_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function saveScore(entry) {
  const scores = loadScores();
  localStorage.setItem(SCORES_KEY, JSON.stringify([entry, ...scores]));
}
