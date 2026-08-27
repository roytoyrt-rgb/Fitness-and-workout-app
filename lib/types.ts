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

// Beyond-the-core-4 nutrients, MyFitnessPal-style. Every field is optional -
// most sources of a food (the built-in library, AI-generated meals) don't
// have this detail, but barcode scans (via Open Food Facts) and custom
// entries can supply it.
export interface ExtendedNutrients {
  fiber?: number | null;
  sugar?: number | null;
  sodium?: number | null; // mg
  saturatedFat?: number | null;
  cholesterol?: number | null; // mg
}

export interface Food extends ExtendedNutrients {
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

export interface LogEntry extends ExtendedNutrients {
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

export interface ExerciseEntry {
  id: number;
  date: string; // YYYY-MM-DD
  name: string;
  calories: number;
  minutes: number | null;
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

export type PreferenceType = 'like' | 'dislike';

export interface FoodPreference {
  id: number;
  foodName: string;
  preference: PreferenceType;
  createdAt: string;
}
