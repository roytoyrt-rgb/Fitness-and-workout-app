import type { SQLiteDatabase } from 'expo-sqlite';
import { getLogEntriesBetween } from './queries';
import { sumMacros } from './macros';
import { addDays, addMonths, toDateKey, MONTH_LABELS } from './date';
import type { Macros } from './types';

export interface DayPoint {
  dateKey: string;
  label: string;
  macros: Macros;
}

export interface MonthPoint {
  label: string;
  macros: Macros; // average per day that month
  daysLogged: number;
}

const WEEKDAY_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export async function getWeekSeries(db: SQLiteDatabase, endDate: Date = new Date()): Promise<DayPoint[]> {
  const start = addDays(endDate, -6);
  const entries = await getLogEntriesBetween(db, toDateKey(start), toDateKey(endDate));

  const points: DayPoint[] = [];
  for (let i = 0; i < 7; i++) {
    const d = addDays(start, i);
    const key = toDateKey(d);
    const dayEntries = entries.filter((e) => e.date === key);
    points.push({ dateKey: key, label: WEEKDAY_SHORT[d.getDay()], macros: sumMacros(dayEntries) });
  }
  return points;
}

export async function getMonthSeries(db: SQLiteDatabase, endDate: Date = new Date()): Promise<DayPoint[]> {
  const start = addDays(endDate, -29);
  const entries = await getLogEntriesBetween(db, toDateKey(start), toDateKey(endDate));

  const points: DayPoint[] = [];
  for (let i = 0; i < 30; i++) {
    const d = addDays(start, i);
    const key = toDateKey(d);
    const dayEntries = entries.filter((e) => e.date === key);
    points.push({ dateKey: key, label: String(d.getDate()), macros: sumMacros(dayEntries) });
  }
  return points;
}

export async function getYearSeries(db: SQLiteDatabase, endDate: Date = new Date()): Promise<MonthPoint[]> {
  const start = addMonths(endDate, -11);
  start.setDate(1);
  const rangeEnd = addDays(endDate, 1);
  const entries = await getLogEntriesBetween(db, toDateKey(start), toDateKey(rangeEnd));

  const points: MonthPoint[] = [];
  for (let i = 0; i < 12; i++) {
    const monthDate = addMonths(start, i);
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const monthEntries = entries.filter((e) => {
      const [ey, em] = e.date.split('-').map(Number);
      return ey === year && em - 1 === month;
    });
    const daysLogged = new Set(monthEntries.map((e) => e.date)).size;
    const totals = sumMacros(monthEntries);
    const divisor = Math.max(daysLogged, 1);
    points.push({
      label: MONTH_LABELS[month],
      daysLogged,
      macros: {
        calories: daysLogged ? Math.round(totals.calories / divisor) : 0,
        protein: daysLogged ? Math.round(totals.protein / divisor) : 0,
        carbs: daysLogged ? Math.round(totals.carbs / divisor) : 0,
        fat: daysLogged ? Math.round(totals.fat / divisor) : 0,
      },
    });
  }
  return points;
}

export function averageMacros(points: { macros: Macros }[]): Macros {
  const withData = points.filter((p) => p.macros.calories > 0);
  if (withData.length === 0) return { calories: 0, protein: 0, carbs: 0, fat: 0 };
  const totals = sumMacros(withData.map((p) => p.macros));
  return {
    calories: Math.round(totals.calories / withData.length),
    protein: Math.round(totals.protein / withData.length),
    carbs: Math.round(totals.carbs / withData.length),
    fat: Math.round(totals.fat / withData.length),
  };
}
