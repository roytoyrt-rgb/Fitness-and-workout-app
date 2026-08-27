// Flat calories-per-minute estimates for common activity types. This is a
// deliberately simple model (no weight/intensity input, unlike MFP's MET-based
// calculation) - good enough for a rough daily estimate, not exact science.
export const EXERCISE_LIBRARY = [
  { name: 'Walking', caloriesPerMinute: 4 },
  { name: 'Running', caloriesPerMinute: 10 },
  { name: 'Cycling', caloriesPerMinute: 8 },
  { name: 'Swimming', caloriesPerMinute: 9 },
  { name: 'Weight training', caloriesPerMinute: 5 },
  { name: 'HIIT', caloriesPerMinute: 12 },
  { name: 'Yoga', caloriesPerMinute: 3 },
  { name: 'Sports (general)', caloriesPerMinute: 8 },
  { name: 'Hiking', caloriesPerMinute: 6 },
  { name: 'Dancing', caloriesPerMinute: 6 },
] as const;

export function estimateCalories(caloriesPerMinute: number, minutes: number): number {
  return Math.round(caloriesPerMinute * minutes);
}
