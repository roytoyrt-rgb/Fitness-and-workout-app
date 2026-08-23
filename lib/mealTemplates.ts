import type { MealTemplate } from './types';

// A small library of deliberately simple, high-protein meals: few ingredients,
// minimal steps. Used to auto-fill a starting meal plan, and as a fallback
// when the AI plan generation isn't available.
export const MEAL_LIBRARY: MealTemplate[] = [
  {
    title: 'Greek yogurt + berries + honey',
    mealSlot: 'breakfast',
    ingredients: ['1 cup Greek yogurt, plain nonfat', '1/2 cup mixed berries', '1 tsp honey'],
    steps: ['Spoon yogurt into a bowl.', 'Top with berries and honey.'],
    calories: 220, protein: 22, carbs: 27, fat: 1,
  },
  {
    title: '3-egg scramble + spinach + toast',
    mealSlot: 'breakfast',
    ingredients: ['3 eggs', '1 cup spinach', '1 slice whole wheat bread'],
    steps: ['Scramble eggs with spinach in a nonstick pan over medium heat.', 'Toast the bread and serve alongside.'],
    calories: 350, protein: 26, carbs: 22, fat: 17,
  },
  {
    title: 'Protein oats',
    mealSlot: 'breakfast',
    ingredients: ['1/2 cup dry oats', '1 scoop whey protein', '1 cup milk (2%)', 'cinnamon'],
    steps: ['Cook oats with milk on the stove or microwave.', 'Stir in protein powder once slightly cooled.'],
    calories: 420, protein: 41, carbs: 46, fat: 8,
  },
  {
    title: 'Cottage cheese + banana',
    mealSlot: 'breakfast',
    ingredients: ['1 cup low-fat cottage cheese', '1 banana'],
    steps: ['Slice banana over cottage cheese.'],
    calories: 250, protein: 25, carbs: 34, fat: 2,
  },
  {
    title: 'Egg white omelet + turkey',
    mealSlot: 'breakfast',
    ingredients: ['1.5 cups egg whites', '80g turkey breast, diced', 'vegetables of choice'],
    steps: ['Sauté turkey and vegetables briefly.', 'Add egg whites, cook through, fold.'],
    calories: 260, protein: 40, carbs: 3, fat: 3,
  },
  {
    title: 'Chicken + rice + broccoli bowl',
    mealSlot: 'lunch',
    ingredients: ['150g chicken breast, cooked', '180g rice, cooked', '150g broccoli, steamed'],
    steps: ['Reheat or grill chicken.', 'Plate over rice with broccoli on the side.'],
    calories: 480, protein: 42, carbs: 55, fat: 6,
  },
  {
    title: 'Tuna salad wrap',
    mealSlot: 'lunch',
    ingredients: ['1 can tuna in water', '1 tbsp Greek yogurt (instead of mayo)', '1 whole wheat wrap', 'lettuce, tomato'],
    steps: ['Mix tuna with yogurt.', 'Fill wrap with tuna and vegetables, roll up.'],
    calories: 380, protein: 38, carbs: 30, fat: 8,
  },
  {
    title: 'Turkey chili (batch-friendly)',
    mealSlot: 'lunch',
    ingredients: ['150g ground turkey', '150g black beans, cooked', 'canned tomatoes', 'chili spices'],
    steps: ['Brown turkey in a pot.', 'Add beans, tomatoes, and spices, simmer 15 min.'],
    calories: 420, protein: 40, carbs: 32, fat: 12,
  },
  {
    title: 'Chickpea + tuna salad',
    mealSlot: 'lunch',
    ingredients: ['150g chickpeas, cooked', '1 can tuna in water', 'olive oil', 'lemon', 'greens'],
    steps: ['Toss chickpeas, tuna, and greens.', 'Dress with olive oil and lemon juice.'],
    calories: 450, protein: 40, carbs: 38, fat: 14,
  },
  {
    title: 'Steak + sweet potato',
    mealSlot: 'dinner',
    ingredients: ['150g lean beef, cooked', '200g sweet potato, baked', 'green salad'],
    steps: ['Sear beef to preference.', 'Serve with baked sweet potato and a simple salad.'],
    calories: 520, protein: 43, carbs: 42, fat: 18,
  },
  {
    title: 'Baked salmon + quinoa + greens',
    mealSlot: 'dinner',
    ingredients: ['150g salmon', '150g quinoa, cooked', 'steamed greens'],
    steps: ['Bake salmon at 200°C (400°F) for 12-15 min.', 'Serve over quinoa with greens.'],
    calories: 520, protein: 41, carbs: 33, fat: 22,
  },
  {
    title: 'Shrimp stir-fry',
    mealSlot: 'dinner',
    ingredients: ['200g shrimp', 'mixed vegetables', '180g rice, cooked', 'soy sauce, garlic'],
    steps: ['Stir-fry shrimp and vegetables with garlic and soy sauce.', 'Serve over rice.'],
    calories: 460, protein: 38, carbs: 50, fat: 6,
  },
  {
    title: 'Tofu + vegetable curry',
    mealSlot: 'dinner',
    ingredients: ['200g firm tofu', 'mixed vegetables', 'curry paste + coconut milk (light)', '180g rice, cooked'],
    steps: ['Pan-fry tofu until golden.', 'Simmer with vegetables and curry sauce, serve over rice.'],
    calories: 500, protein: 30, carbs: 55, fat: 16,
  },
  {
    title: 'Turkey burger + potato + salad',
    mealSlot: 'dinner',
    ingredients: ['150g ground turkey, formed into a patty', '200g potato, baked', 'green salad'],
    steps: ['Grill or pan-fry the turkey patty.', 'Serve with baked potato and salad.'],
    calories: 470, protein: 40, carbs: 38, fat: 14,
  },
  {
    title: 'Cottage cheese + almonds',
    mealSlot: 'snack',
    ingredients: ['1 cup low-fat cottage cheese', '15g almonds'],
    steps: ['Combine and eat.'],
    calories: 180, protein: 15, carbs: 8, fat: 9,
  },
  {
    title: 'Protein shake',
    mealSlot: 'snack',
    ingredients: ['1 scoop whey protein', '250ml milk (2%)'],
    steps: ['Shake or blend together.'],
    calories: 240, protein: 27, carbs: 13, fat: 7,
  },
  {
    title: 'Greek yogurt + protein bar',
    mealSlot: 'snack',
    ingredients: ['1/2 cup Greek yogurt', '1/2 protein bar'],
    steps: ['Eat together or separately.'],
    calories: 200, protein: 18, carbs: 20, fat: 5,
  },
  {
    title: 'Hard-boiled eggs',
    mealSlot: 'snack',
    ingredients: ['2 eggs, hard-boiled'],
    steps: ['Boil 8-10 minutes, cool, peel.'],
    calories: 140, protein: 13, carbs: 1, fat: 9,
  },
  {
    title: 'Turkey + cheese roll-ups',
    mealSlot: 'snack',
    ingredients: ['100g turkey breast, sliced', '2 slices low-fat cheese'],
    steps: ['Roll cheese inside turkey slices.'],
    calories: 190, protein: 28, carbs: 2, fat: 7,
  },
];

export function templatesFor(mealSlot: MealTemplate['mealSlot']): MealTemplate[] {
  return MEAL_LIBRARY.filter((m) => m.mealSlot === mealSlot);
}

// Preferences are stored against food-database names like "Chicken breast,
// cooked" or "Mushrooms, sauteed", while meal template ingredients are
// free-text like "150g chicken breast, cooked". Reduce a food name to its
// first, most distinctive word/phrase (drop the ", cooked"-style suffix)
// and match that as a substring - imprecise, but good enough to keep
// "no mushrooms" out of a meal plan without needing exact-string matching.
function keywordFor(foodName: string): string {
  return foodName.split(',')[0].trim().toLowerCase();
}

function templateText(template: MealTemplate): string {
  return `${template.title} ${template.ingredients.join(' ')}`.toLowerCase();
}

function matchesAny(template: MealTemplate, foodNames: string[]): boolean {
  if (foodNames.length === 0) return false;
  const text = templateText(template);
  return foodNames.some((name) => {
    const keyword = keywordFor(name);
    return keyword.length > 0 && text.includes(keyword);
  });
}

// Filters out disliked templates (falling back to the full list if that
// would leave nothing for a slot), then sorts liked-matching templates
// first. Stable otherwise, so the deterministic weekly rotation below
// still varies meal-to-meal rather than always picking the same "liked" one.
export function rankedTemplatesFor(mealSlot: MealTemplate['mealSlot'], likes: string[], dislikes: string[]): MealTemplate[] {
  const all = templatesFor(mealSlot);
  const allowed = all.filter((t) => !matchesAny(t, dislikes));
  const pool = allowed.length > 0 ? allowed : all;
  return [...pool].sort((a, b) => Number(matchesAny(b, likes)) - Number(matchesAny(a, likes)));
}

export function alternativesFor(
  mealSlot: MealTemplate['mealSlot'],
  likes: string[],
  dislikes: string[],
  excludeTitle: string
): MealTemplate[] {
  return rankedTemplatesFor(mealSlot, likes, dislikes).filter((t) => t.title !== excludeTitle);
}

// Deterministic rotation so the same week offset always returns the same
// simple plan, but different weeks vary.
export function buildLibraryWeekPlan(
  weekIndex: number,
  likes: string[] = [],
  dislikes: string[] = []
): { dayOfWeek: number; mealSlot: MealTemplate['mealSlot']; template: MealTemplate }[] {
  const slots: MealTemplate['mealSlot'][] = ['breakfast', 'lunch', 'dinner', 'snack'];
  const plan: { dayOfWeek: number; mealSlot: MealTemplate['mealSlot']; template: MealTemplate }[] = [];

  for (let day = 0; day < 7; day++) {
    slots.forEach((slot, slotIndex) => {
      const options = rankedTemplatesFor(slot, likes, dislikes);
      const idx = (weekIndex + day + slotIndex) % options.length;
      plan.push({ dayOfWeek: day, mealSlot: slot, template: options[idx] });
    });
  }

  return plan;
}
