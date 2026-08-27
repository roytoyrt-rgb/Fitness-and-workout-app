import type { SQLiteDatabase } from 'expo-sqlite';
import { Platform, Share } from 'react-native';

const BACKUP_VERSION = 1;

interface BackupData {
  version: number;
  exportedAt: string;
  goals: Record<string, unknown> | null;
  foods: Record<string, unknown>[];
  logEntries: Record<string, unknown>[];
  exerciseEntries: Record<string, unknown>[];
  mealPlanItems: Record<string, unknown>[];
  settings: Record<string, unknown>[];
}

export async function buildBackupJson(db: SQLiteDatabase): Promise<string> {
  const [goals, foods, logEntries, exerciseEntries, mealPlanItems, settings] = await Promise.all([
    db.getFirstAsync<Record<string, unknown>>('SELECT * FROM goals WHERE id = 1'),
    db.getAllAsync<Record<string, unknown>>('SELECT * FROM foods WHERE is_custom = 1'),
    db.getAllAsync<Record<string, unknown>>('SELECT * FROM log_entries'),
    db.getAllAsync<Record<string, unknown>>('SELECT * FROM exercise_entries'),
    db.getAllAsync<Record<string, unknown>>('SELECT * FROM meal_plan_items'),
    db.getAllAsync<Record<string, unknown>>('SELECT * FROM settings'),
  ]);

  const backup: BackupData = {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    goals: goals ?? null,
    foods,
    logEntries,
    exerciseEntries,
    mealPlanItems,
    settings,
  };

  return JSON.stringify(backup, null, 2);
}

// Web: downloads a .json file directly. Native: opens the share sheet so it
// can be saved to Files, emailed, AirDropped, etc. - there's no bundled
// file-picker dependency to lean on here, so the share sheet is the
// lowest-friction way to get the file off the device.
export async function exportBackup(db: SQLiteDatabase): Promise<void> {
  const json = await buildBackupJson(db);
  const filename = `simple-macros-backup-${new Date().toISOString().slice(0, 10)}.json`;

  if (Platform.OS === 'web') {
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } else {
    await Share.share({ message: json, title: filename });
  }
}

// Restoring replaces all local data with the backup's contents - merging is
// a lot more error-prone (id collisions, duplicate entries) for what's
// meant to be a "recover after data loss" or "move to a new device" tool.
export async function restoreBackup(db: SQLiteDatabase, json: string): Promise<void> {
  let data: BackupData;
  try {
    data = JSON.parse(json);
  } catch {
    throw new Error('That doesn’t look like a valid backup file.');
  }
  if (data.version !== BACKUP_VERSION) {
    throw new Error('This backup was made by a different app version and can’t be restored.');
  }

  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM log_entries');
    await db.runAsync('DELETE FROM exercise_entries');
    await db.runAsync('DELETE FROM meal_plan_items');
    await db.runAsync('DELETE FROM foods WHERE is_custom = 1');

    const g = data.goals as any;
    if (g) {
      await db.runAsync('UPDATE goals SET calories = ?, protein = ?, carbs = ?, fat = ?, updated_at = ? WHERE id = 1', [
        g.calories, g.protein, g.carbs, g.fat, g.updated_at ?? new Date().toISOString(),
      ]);
    }

    for (const food of data.foods ?? []) {
      const f = food as any;
      await db.runAsync(
        `INSERT INTO foods (
          name, calories_per_100, protein_per_100, carbs_per_100, fat_per_100, default_serving_g, is_custom, barcode,
          fiber_per_100, sugar_per_100, sodium_per_100, saturated_fat_per_100, cholesterol_per_100
        ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?)`,
        [
          f.name, f.calories_per_100, f.protein_per_100, f.carbs_per_100, f.fat_per_100, f.default_serving_g, f.barcode ?? null,
          f.fiber_per_100 ?? null, f.sugar_per_100 ?? null, f.sodium_per_100 ?? null, f.saturated_fat_per_100 ?? null, f.cholesterol_per_100 ?? null,
        ]
      );
    }

    for (const entry of data.logEntries ?? []) {
      const e = entry as any;
      await db.runAsync(
        `INSERT INTO log_entries (
          date, food_id, food_name, grams, calories, protein, carbs, fat, meal_slot, created_at,
          fiber, sugar, sodium, saturated_fat, cholesterol
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          e.date, null, e.food_name, e.grams, e.calories, e.protein, e.carbs, e.fat, e.meal_slot, e.created_at ?? new Date().toISOString(),
          e.fiber ?? null, e.sugar ?? null, e.sodium ?? null, e.saturated_fat ?? null, e.cholesterol ?? null,
        ]
      );
    }

    for (const entry of data.exerciseEntries ?? []) {
      const ex = entry as any;
      await db.runAsync(
        'INSERT INTO exercise_entries (date, name, calories, minutes, created_at) VALUES (?, ?, ?, ?, ?)',
        [ex.date, ex.name, ex.calories, ex.minutes ?? null, ex.created_at ?? new Date().toISOString()]
      );
    }

    for (const item of data.mealPlanItems ?? []) {
      const m = item as any;
      await db.runAsync(
        'INSERT INTO meal_plan_items (week_start, day_of_week, meal_slot, title, ingredients, steps, calories, protein, carbs, fat, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [m.week_start, m.day_of_week, m.meal_slot, m.title, m.ingredients, m.steps, m.calories, m.protein, m.carbs, m.fat, m.source]
      );
    }

    for (const setting of data.settings ?? []) {
      const s = setting as any;
      await db.runAsync(
        'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
        [s.key, s.value]
      );
    }
  });
}
