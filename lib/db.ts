import type { SQLiteDatabase } from 'expo-sqlite';
import { DEFAULT_GOALS } from './macros';
import { SEED_FOODS } from './foods';

export const DB_NAME = 'simple-macros.db';

// Every step here is written to be safely re-runnable: schema statements
// use IF NOT EXISTS, and data seeding checks before inserting, rather than
// being gated behind PRAGMA user_version. That's deliberate - testing on
// the web SQLite backend showed PRAGMA user_version does not reliably
// survive a page reload (the tables it's meant to gate do persist, so a
// naive version-gated migration tries to re-run CREATE TABLE against a
// database that already has them, and crashes). Making every step
// idempotent sidesteps that regardless of the underlying cause, and is
// good practice for a migration function generally.
export async function migrateDbIfNeeded(db: SQLiteDatabase) {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS goals (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      calories REAL NOT NULL,
      protein REAL NOT NULL,
      carbs REAL NOT NULL,
      fat REAL NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS foods (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      calories_per_100 REAL NOT NULL,
      protein_per_100 REAL NOT NULL,
      carbs_per_100 REAL NOT NULL,
      fat_per_100 REAL NOT NULL,
      default_serving_g REAL NOT NULL,
      is_custom INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS log_entries (
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
    CREATE INDEX IF NOT EXISTS idx_log_entries_date ON log_entries(date);

    CREATE TABLE IF NOT EXISTS meal_plan_items (
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
    CREATE INDEX IF NOT EXISTS idx_meal_plan_week ON meal_plan_items(week_start);

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS food_preferences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      food_name TEXT NOT NULL,
      preference TEXT NOT NULL CHECK (preference IN ('like', 'dislike')),
      created_at TEXT NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_food_preferences_name ON food_preferences(food_name COLLATE NOCASE);
  `);

  // foods.barcode was added after the initial release - add it if an
  // older database doesn't have it yet.
  const columns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(foods)');
  if (!columns.some((c) => c.name === 'barcode')) {
    await db.execAsync('ALTER TABLE foods ADD COLUMN barcode TEXT');
  }
  await db.execAsync('CREATE UNIQUE INDEX IF NOT EXISTS idx_foods_barcode ON foods(barcode) WHERE barcode IS NOT NULL');

  const goalsRow = await db.getFirstAsync<{ id: number }>('SELECT id FROM goals WHERE id = 1');
  if (!goalsRow) {
    await db.runAsync(
      'INSERT INTO goals (id, calories, protein, carbs, fat, updated_at) VALUES (1, ?, ?, ?, ?, ?)',
      [DEFAULT_GOALS.calories, DEFAULT_GOALS.protein, DEFAULT_GOALS.carbs, DEFAULT_GOALS.fat, new Date().toISOString()]
    );
  }

  // Seeding is a per-name existence check rather than a one-time bulk
  // insert so the food list can keep growing across releases (it has
  // twice already) without duplicating what's already there.
  for (const food of SEED_FOODS) {
    const existing = await db.getFirstAsync<{ id: number }>('SELECT id FROM foods WHERE name = ? AND is_custom = 0', [
      food.name,
    ]);
    if (!existing) {
      await db.runAsync(
        'INSERT INTO foods (name, calories_per_100, protein_per_100, carbs_per_100, fat_per_100, default_serving_g, is_custom) VALUES (?, ?, ?, ?, ?, ?, 0)',
        [food.name, food.caloriesPer100, food.proteinPer100, food.carbsPer100, food.fatPer100, food.defaultServingG]
      );
    }
  }
}
