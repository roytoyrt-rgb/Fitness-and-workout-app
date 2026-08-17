import type { SQLiteDatabase } from 'expo-sqlite';
import { DEFAULT_GOALS } from './macros';
import { SEED_FOODS } from './foods';

export const DB_NAME = 'simple-macros.db';

export async function migrateDbIfNeeded(db: SQLiteDatabase) {
  const result = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let version = result?.user_version ?? 0;

  if (version === 0) {
    await db.execAsync(`
      PRAGMA journal_mode = WAL;

      CREATE TABLE goals (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        calories REAL NOT NULL,
        protein REAL NOT NULL,
        carbs REAL NOT NULL,
        fat REAL NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE foods (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        calories_per_100 REAL NOT NULL,
        protein_per_100 REAL NOT NULL,
        carbs_per_100 REAL NOT NULL,
        fat_per_100 REAL NOT NULL,
        default_serving_g REAL NOT NULL,
        is_custom INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE log_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        food_id INTEGER,
        food_name TEXT NOT NULL,
        grams REAL NOT NULL,
        calories REAL NOT NULL,
        protein REAL NOT NULL,
        carbs REAL NOT NULL,
        fat REAL NOT NULL,
        meal_slot TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE INDEX idx_log_entries_date ON log_entries(date);

      CREATE TABLE meal_plan_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        week_start TEXT NOT NULL,
        day_of_week INTEGER NOT NULL,
        meal_slot TEXT NOT NULL,
        title TEXT NOT NULL,
        ingredients TEXT NOT NULL,
        steps TEXT NOT NULL,
        calories REAL NOT NULL,
        protein REAL NOT NULL,
        carbs REAL NOT NULL,
        fat REAL NOT NULL,
        source TEXT NOT NULL
      );
      CREATE INDEX idx_meal_plan_week ON meal_plan_items(week_start);

      CREATE TABLE settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);

    await db.runAsync(
      'INSERT INTO goals (id, calories, protein, carbs, fat, updated_at) VALUES (1, ?, ?, ?, ?, ?)',
      [DEFAULT_GOALS.calories, DEFAULT_GOALS.protein, DEFAULT_GOALS.carbs, DEFAULT_GOALS.fat, new Date().toISOString()]
    );

    for (const food of SEED_FOODS) {
      await db.runAsync(
        'INSERT INTO foods (name, calories_per_100, protein_per_100, carbs_per_100, fat_per_100, default_serving_g, is_custom) VALUES (?, ?, ?, ?, ?, ?, 0)',
        [food.name, food.caloriesPer100, food.proteinPer100, food.carbsPer100, food.fatPer100, food.defaultServingG]
      );
    }

    version = 1;
  }

  await db.execAsync(`PRAGMA user_version = ${version}`);
}
