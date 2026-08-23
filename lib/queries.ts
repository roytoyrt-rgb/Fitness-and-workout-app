import type { SQLiteDatabase } from 'expo-sqlite';
import type { DaySummary, Food, FoodPreference, Goals, LogEntry, MealPlanItem, MealSlot, MealTemplate, PreferenceType } from './types';

// ---- Goals ----

export async function getGoals(db: SQLiteDatabase): Promise<Goals> {
  const row = await db.getFirstAsync<{
    id: number;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    updated_at: string;
  }>('SELECT * FROM goals WHERE id = 1');
  if (!row) throw new Error('Goals row missing');
  return {
    id: row.id,
    calories: row.calories,
    protein: row.protein,
    carbs: row.carbs,
    fat: row.fat,
    updatedAt: row.updated_at,
  };
}

export async function updateGoals(
  db: SQLiteDatabase,
  goals: { calories: number; protein: number; carbs: number; fat: number }
): Promise<void> {
  await db.runAsync(
    'UPDATE goals SET calories = ?, protein = ?, carbs = ?, fat = ?, updated_at = ? WHERE id = 1',
    [goals.calories, goals.protein, goals.carbs, goals.fat, new Date().toISOString()]
  );
}

// ---- Foods ----

function mapFoodRow(row: any): Food {
  return {
    id: row.id,
    name: row.name,
    caloriesPer100: row.calories_per_100,
    proteinPer100: row.protein_per_100,
    carbsPer100: row.carbs_per_100,
    fatPer100: row.fat_per_100,
    defaultServingG: row.default_serving_g,
    isCustom: !!row.is_custom,
    barcode: row.barcode ?? null,
  };
}

export async function searchFoods(db: SQLiteDatabase, query: string): Promise<Food[]> {
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM foods WHERE name LIKE ? ORDER BY is_custom DESC, name ASC LIMIT 50',
    [`%${query}%`]
  );
  return rows.map(mapFoodRow);
}

export async function findFoodByBarcode(db: SQLiteDatabase, barcode: string): Promise<Food | null> {
  const row = await db.getFirstAsync<any>('SELECT * FROM foods WHERE barcode = ?', [barcode]);
  return row ? mapFoodRow(row) : null;
}

export async function insertCustomFood(
  db: SQLiteDatabase,
  food: Omit<Food, 'id' | 'isCustom'>
): Promise<number> {
  const result = await db.runAsync(
    'INSERT INTO foods (name, calories_per_100, protein_per_100, carbs_per_100, fat_per_100, default_serving_g, is_custom, barcode) VALUES (?, ?, ?, ?, ?, ?, 1, ?)',
    [
      food.name,
      food.caloriesPer100,
      food.proteinPer100,
      food.carbsPer100,
      food.fatPer100,
      food.defaultServingG,
      food.barcode ?? null,
    ]
  );
  return result.lastInsertRowId;
}

// ---- Log entries ----

function mapLogRow(row: any): LogEntry {
  return {
    id: row.id,
    date: row.date,
    foodId: row.food_id,
    foodName: row.food_name,
    grams: row.grams,
    calories: row.calories,
    protein: row.protein,
    carbs: row.carbs,
    fat: row.fat,
    mealSlot: row.meal_slot,
    createdAt: row.created_at,
  };
}

export async function getLogEntriesForDate(db: SQLiteDatabase, date: string): Promise<LogEntry[]> {
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM log_entries WHERE date = ? ORDER BY created_at ASC',
    [date]
  );
  return rows.map(mapLogRow);
}

export async function getLogEntriesBetween(
  db: SQLiteDatabase,
  startDate: string,
  endDate: string
): Promise<LogEntry[]> {
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM log_entries WHERE date >= ? AND date <= ? ORDER BY date ASC',
    [startDate, endDate]
  );
  return rows.map(mapLogRow);
}

export async function insertLogEntry(
  db: SQLiteDatabase,
  entry: Omit<LogEntry, 'id' | 'createdAt'>
): Promise<number> {
  const result = await db.runAsync(
    'INSERT INTO log_entries (date, food_id, food_name, grams, calories, protein, carbs, fat, meal_slot, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [
      entry.date,
      entry.foodId,
      entry.foodName,
      entry.grams,
      entry.calories,
      entry.protein,
      entry.carbs,
      entry.fat,
      entry.mealSlot,
      new Date().toISOString(),
    ]
  );
  return result.lastInsertRowId;
}

export async function getRecentLogDates(
  db: SQLiteDatabase,
  excludeDate: string,
  limit = 60
): Promise<DaySummary[]> {
  const rows = await db.getAllAsync<{ date: string; itemCount: number; calories: number }>(
    `SELECT date, COUNT(*) as itemCount, SUM(calories) as calories
     FROM log_entries
     WHERE date != ?
     GROUP BY date
     ORDER BY date DESC
     LIMIT ?`,
    [excludeDate, limit]
  );
  return rows;
}

export async function copyLogEntries(
  db: SQLiteDatabase,
  entries: LogEntry[],
  toDate: string
): Promise<void> {
  await db.withTransactionAsync(async () => {
    for (const entry of entries) {
      await db.runAsync(
        'INSERT INTO log_entries (date, food_id, food_name, grams, calories, protein, carbs, fat, meal_slot, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          toDate,
          entry.foodId,
          entry.foodName,
          entry.grams,
          entry.calories,
          entry.protein,
          entry.carbs,
          entry.fat,
          entry.mealSlot,
          new Date().toISOString(),
        ]
      );
    }
  });
}

export async function deleteLogEntry(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync('DELETE FROM log_entries WHERE id = ?', [id]);
}

// ---- Meal plan ----

function mapMealPlanRow(row: any): MealPlanItem {
  return {
    id: row.id,
    weekStart: row.week_start,
    dayOfWeek: row.day_of_week,
    mealSlot: row.meal_slot,
    title: row.title,
    ingredients: JSON.parse(row.ingredients),
    steps: JSON.parse(row.steps),
    calories: row.calories,
    protein: row.protein,
    carbs: row.carbs,
    fat: row.fat,
    source: row.source,
  };
}

export async function getMealPlanForWeek(db: SQLiteDatabase, weekStart: string): Promise<MealPlanItem[]> {
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM meal_plan_items WHERE week_start = ? ORDER BY day_of_week ASC, meal_slot ASC',
    [weekStart]
  );
  return rows.map(mapMealPlanRow);
}

export async function getMealPlanItem(db: SQLiteDatabase, id: number): Promise<MealPlanItem | null> {
  const row = await db.getFirstAsync<any>('SELECT * FROM meal_plan_items WHERE id = ?', [id]);
  return row ? mapMealPlanRow(row) : null;
}

export async function updateMealPlanItemContent(
  db: SQLiteDatabase,
  id: number,
  template: MealTemplate,
  source: MealPlanItem['source']
): Promise<void> {
  await db.runAsync(
    'UPDATE meal_plan_items SET title = ?, ingredients = ?, steps = ?, calories = ?, protein = ?, carbs = ?, fat = ?, source = ? WHERE id = ?',
    [
      template.title,
      JSON.stringify(template.ingredients),
      JSON.stringify(template.steps),
      template.calories,
      template.protein,
      template.carbs,
      template.fat,
      source,
      id,
    ]
  );
}

export async function replaceMealPlanForWeek(
  db: SQLiteDatabase,
  weekStart: string,
  items: Omit<MealPlanItem, 'id' | 'weekStart'>[]
): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM meal_plan_items WHERE week_start = ?', [weekStart]);
    for (const item of items) {
      await db.runAsync(
        'INSERT INTO meal_plan_items (week_start, day_of_week, meal_slot, title, ingredients, steps, calories, protein, carbs, fat, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          weekStart,
          item.dayOfWeek,
          item.mealSlot,
          item.title,
          JSON.stringify(item.ingredients),
          JSON.stringify(item.steps),
          item.calories,
          item.protein,
          item.carbs,
          item.fat,
          item.source,
        ]
      );
    }
  });
}

// ---- Settings (key/value) ----

export async function getSetting(db: SQLiteDatabase, key: string): Promise<string | null> {
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key = ?', [key]);
  return row?.value ?? null;
}

export async function setSetting(db: SQLiteDatabase, key: string, value: string): Promise<void> {
  await db.runAsync('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', [
    key,
    value,
  ]);
}

// ---- Food preferences ----

function mapPreferenceRow(row: any): FoodPreference {
  return {
    id: row.id,
    foodName: row.food_name,
    preference: row.preference,
    createdAt: row.created_at,
  };
}

export async function getFoodPreferences(db: SQLiteDatabase): Promise<FoodPreference[]> {
  const rows = await db.getAllAsync<any>('SELECT * FROM food_preferences ORDER BY food_name COLLATE NOCASE ASC');
  return rows.map(mapPreferenceRow);
}

export async function getPreferenceNames(db: SQLiteDatabase): Promise<{ likes: string[]; dislikes: string[] }> {
  const prefs = await getFoodPreferences(db);
  return {
    likes: prefs.filter((p) => p.preference === 'like').map((p) => p.foodName),
    dislikes: prefs.filter((p) => p.preference === 'dislike').map((p) => p.foodName),
  };
}

export async function setFoodPreference(db: SQLiteDatabase, foodName: string, preference: PreferenceType): Promise<void> {
  await db.runAsync(
    `INSERT INTO food_preferences (food_name, preference, created_at) VALUES (?, ?, ?)
     ON CONFLICT(food_name COLLATE NOCASE) DO UPDATE SET preference = excluded.preference`,
    [foodName, preference, new Date().toISOString()]
  );
}

export async function removeFoodPreference(db: SQLiteDatabase, foodName: string): Promise<void> {
  await db.runAsync('DELETE FROM food_preferences WHERE food_name = ? COLLATE NOCASE', [foodName]);
}
