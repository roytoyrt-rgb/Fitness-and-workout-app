export function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayKey(): string {
  return toDateKey(new Date());
}

// `new Date("YYYY-MM-DD")` parses as UTC midnight, which shifts a day in
// negative-offset timezones. Parse the components as local time instead.
export function parseDateKey(dateKey: string): Date {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(d: Date, days: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + days);
  return copy;
}

export function addMonths(d: Date, months: number): Date {
  const copy = new Date(d);
  copy.setMonth(copy.getMonth() + months);
  return copy;
}

// Monday-start week key for a given date.
export function weekStartKey(d: Date = new Date()): string {
  const day = d.getDay(); // 0=Sun..6=Sat
  const diffToMonday = day === 0 ? -6 : 1 - day;
  return toDateKey(addDays(d, diffToMonday));
}

export function dayOfWeekMondayFirst(d: Date): number {
  const day = d.getDay();
  return day === 0 ? 6 : day - 1;
}

export const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export function formatShortDate(dateKey: string): string {
  const [, m, d] = dateKey.split('-').map(Number);
  return `${MONTH_LABELS[m - 1]} ${d}`;
}
