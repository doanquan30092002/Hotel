// Calendar date helpers — pure native Date, no date-fns/dayjs dependency.

/** Parse YYYY-MM-DD as local midnight (avoids UTC timezone shifts). */
export function parseDate(iso: string): Date {
  const parts = iso.split('-').map(Number);
  const y = parts[0] ?? 2000;
  const m = parts[1] ?? 1;
  const d = parts[2] ?? 1;
  return new Date(y, m - 1, d);
}

/** Format a Date as YYYY-MM-DD (local). */
export function formatIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Add N calendar days to a date. */
export function addDays(d: Date, days: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + days);
  return r;
}

/** First day of the month (day=1). */
export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

/** First day of NEXT month (exclusive end). */
export function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 1);
}

/** Monday of the ISO week containing d. */
export function startOfWeek(d: Date): Date {
  const r = new Date(d);
  const day = r.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day;
  r.setDate(r.getDate() + diff);
  return r;
}

/** Monday of the week AFTER d's week (exclusive end). */
export function endOfWeek(d: Date): Date {
  return addDays(startOfWeek(d), 7);
}

/** Midnight of the given date. */
export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Midnight of the NEXT day (exclusive end). */
export function endOfDay(d: Date): Date {
  return addDays(startOfDay(d), 1);
}

/** Number of whole calendar days from `from` to `to`. */
export function daysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / (24 * 3600 * 1000));
}

/** Short Vietnamese weekday labels (index 0 = Sunday). */
export const VN_WEEKDAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'] as const;

/** Vietnamese month label, e.g. "Tháng 5/2026". */
export function monthLabel(d: Date): string {
  return `Tháng ${d.getMonth() + 1}/${d.getFullYear()}`;
}

/** Week range label, e.g. "Tuần 27/04 - 03/05". */
export function weekLabel(from: Date, to: Date): string {
  const fmtShort = (dt: Date) =>
    `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}`;
  // to is exclusive (Monday of next week), so last day = to-1
  const last = addDays(to, -1);
  return `Tuần ${fmtShort(from)} - ${fmtShort(last)}`;
}

/** Day label, e.g. "Ngày 1/5/2026". */
export function dayLabel(d: Date): string {
  return `Ngày ${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}
