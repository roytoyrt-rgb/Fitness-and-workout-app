import type { Macros } from './types';

export const CALORIES_PER_GRAM = { protein: 4, carbs: 4, fat: 9 };

// Sensible default for someone tracking a high-protein diet; user edits in Settings.
export const DEFAULT_GOALS: Macros = {
  calories: 2200,
  protein: 160,
  carbs: 200,
  fat: 70,
};

export function macrosForGrams(
  per100: { caloriesPer100: number; proteinPer100: number; carbsPer100: number; fatPer100: number },
  grams: number
): Macros {
  const factor = grams / 100;
  return {
    calories: Math.round(per100.caloriesPer100 * factor),
    protein: round1(per100.proteinPer100 * factor),
    carbs: round1(per100.carbsPer100 * factor),
    fat: round1(per100.fatPer100 * factor),
  };
}

export function sumMacros(entries: Macros[]): Macros {
  return entries.reduce(
    (acc, m) => ({
      calories: acc.calories + m.calories,
      protein: acc.protein + m.protein,
      carbs: acc.carbs + m.carbs,
      fat: acc.fat + m.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
}

export function caloriesFromMacros(protein: number, carbs: number, fat: number): number {
  return Math.round(
    protein * CALORIES_PER_GRAM.protein + carbs * CALORIES_PER_GRAM.carbs + fat * CALORIES_PER_GRAM.fat
  );
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function proteinDensity(macros: Macros): number {
  // grams of protein per 100 calories - a simple "how protein-dense is this" score
  if (macros.calories <= 0) return 0;
  return round1((macros.protein / macros.calories) * 100);
}
