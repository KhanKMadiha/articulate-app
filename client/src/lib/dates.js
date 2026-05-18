export function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

/** Monday-based ISO week: return { year, week } */
export function getIsoWeek(d = new Date()) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date - yearStart) / 86400000 + 1) / 7);
  return { year: date.getUTCFullYear(), week };
}

export function isDateInSameIsoWeek(dateStr, ref = new Date()) {
  const d = new Date(dateStr + "T12:00:00");
  if (Number.isNaN(d.getTime())) return false;
  const a = getIsoWeek(d);
  const b = getIsoWeek(ref);
  return a.year === b.year && a.week === b.week;
}

export function countReadsThisWeek(readDates) {
  return readDates.filter((ds) => isDateInSameIsoWeek(ds)).length;
}
