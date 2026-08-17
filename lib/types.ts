export type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export const MEAL_SLOTS: MealSlot[] = ['breakfast', 'lunch', 'dinner', 'snack'];

export interface Macros {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface Goals extends Macros {
  id: number;
  updatedAt: string;
}

export interface Food {
  id: number;
  name: string;
  caloriesPer100: number;
  proteinPer100: number;
  carbsPer100: number;
  fatPer100: number;
  defaultServingG: number;
  isCustom: boolean;
  barcode?: string | null;
}

export interface DaySummary {
  date: string;
  itemCount: number;
  calories: number;
}

export interface LogEntry {
  id: number;
  date: string; // YYYY-MM-DD
  foodId: number | null;
  foodName: string;
  grams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  mealSlot: MealSlot;
  createdAt: string;
}

export interface MealPlanItem {
  id: number;
  weekStart: string; // YYYY-MM-DD (Monday)
  dayOfWeek: number; // 0=Mon .. 6=Sun
  mealSlot: MealSlot;
  title: string;
  ingredients: string[];
  steps: string[];
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  source: 'ai' | 'library';
}

export interface MealTemplate {
  title: string;
  mealSlot: MealSlot;
  ingredients: string[];
  steps: string[];
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export type ChartRange = 'week' | 'month' | 'year';
