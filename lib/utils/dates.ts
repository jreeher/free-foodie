/**
 * Get the most recent occurrence of `startDay` on or before `date`.
 * startDay: 0 = Sunday, 1 = Monday, …, 6 = Saturday (default 0).
 * Returns a YYYY-MM-DD string.
 */
export function getWeekStart(date: Date = new Date(), startDay: number = 0): string {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sunday
  const diff = (day - startDay + 7) % 7; // days since last startDay
  d.setDate(d.getDate() - diff);
  return toDateString(d);
}

/** Add N days to a date string, returning a new date string */
export function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return toDateString(d);
}

/** Format Date to YYYY-MM-DD */
export function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Get all 7 date strings for a week starting on weekStart */
export function getWeekDates(weekStart: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

/** Get all 14 date strings for two weeks starting on weekStart */
export function getBiweekDates(weekStart: string): string[] {
  return Array.from({ length: 14 }, (_, i) => addDays(weekStart, i));
}

/** Format a date string for display, e.g. "Mon, Jan 6" */
export function formatDayLabel(dateStr: string): { weekday: string; date: string } {
  const d = new Date(dateStr + 'T00:00:00');
  const weekday = d.toLocaleDateString('en-US', { weekday: 'short' });
  const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return { weekday, date };
}

/** Format week range label, e.g. "Jan 6 - Jan 12" */
export function formatWeekRange(weekStart: string): string {
  const start = new Date(weekStart + 'T00:00:00');
  const end = new Date(weekStart + 'T00:00:00');
  end.setDate(end.getDate() + 6);

  const startStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const endStr = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${startStr} - ${endStr}`;
}

/** Check if a date string is today */
export function isToday(dateStr: string): boolean {
  return dateStr === toDateString(new Date());
}

/** Check if a date string is in the past */
export function isPast(dateStr: string): boolean {
  return dateStr < toDateString(new Date());
}

/** Get the Monday of the previous week from a week start string */
export function getPreviousWeekStart(weekStart: string): string {
  return addDays(weekStart, -7);
}

/** Get the Monday of the next week from a week start string */
export function getNextWeekStart(weekStart: string): string {
  return addDays(weekStart, 7);
}
